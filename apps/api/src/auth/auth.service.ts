import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { User } from '../schemas'
import { MailService } from '../mail/mail.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectModel('User') private userModel: Model<User>,
    private jwt: JwtService,
    private mailService: MailService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  async register(dto: { email?: string; phone?: string; password: string; firstName: string; lastName: string }) {
    if (dto.email) {
      const existing = await this.userModel.findOne({ email: dto.email.toLowerCase().trim() })
      if (existing) throw new BadRequestException('Account is already created with this email. Please log in.')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)
    // 6-digit numeric code for account verification
    const code = crypto.randomInt(100000, 1000000).toString()
    const tokenHash = this.hashToken(code)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const user = await this.userModel.create({
      email: dto.email ? dto.email.toLowerCase().trim() : undefined,
      phone: dto.phone,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      emailVerified: false,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,
      emailVerificationLastSentAt: new Date(),
    })

    if (user.email) {
      this.mailService
        .sendVerificationEmail(`${user.firstName} ${user.lastName}`, user.email, code)
        .catch((e) => this.logger.error(`Failed to send verification email: ${e.message}`))
    }

    return {
      message: 'Account created! Verification code sent to your email address.',
      email: user.email,
      emailVerified: false,
    }
  }

  async login(dto: { email?: string; phone?: string; password: string }) {
    const emailOrPhone = dto.email ? dto.email.toLowerCase().trim() : undefined
    const query = emailOrPhone
      ? { $or: [{ email: emailOrPhone }, { phone: dto.phone }] }
      : { phone: dto.phone }

    const user = await this.userModel.findOne(query)
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    if (user.role === 'CUSTOMER' && !user.emailVerified) {
      throw new ForbiddenException('EMAIL_NOT_VERIFIED: Please verify your email address before logging in.')
    }

    if (!user.email) {
      // Fallback for phone-only accounts if any
      return this.generateTokens(user)
    }

    // Generate cryptographically secure 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 1000000).toString()
    const otpHash = this.hashToken(otp)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    user.loginOtpHash = otpHash
    user.loginOtpExpiresAt = expiresAt
    user.loginOtpLastSentAt = new Date()
    user.loginOtpAttempts = 0
    await user.save()

    // Send real OTP email to the customer's email
    await this.mailService.sendLoginOtpEmail(
      `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      user.email,
      otp,
      5,
    )

    return {
      requiresOtp: true,
      email: user.email,
      message: 'Verification code sent to your email address. Please enter the code to complete login.',
    }
  }

  async verifyLoginOtp(dto: { email: string; otp: string }) {
    if (!dto.email || !dto.otp) {
      throw new BadRequestException('Email address and verification code are required.')
    }

    const cleanEmail = dto.email.toLowerCase().trim()
    const user = await this.userModel.findOne({ email: cleanEmail })

    if (!user || !user.loginOtpHash || !user.loginOtpExpiresAt) {
      throw new BadRequestException('Invalid or expired verification session. Please log in again.')
    }

    if (new Date() > user.loginOtpExpiresAt) {
      throw new BadRequestException('Verification code has expired. Please request a new code.')
    }

    if (user.loginOtpAttempts >= 5) {
      user.loginOtpHash = undefined as any
      user.loginOtpExpiresAt = undefined as any
      user.loginOtpLastSentAt = undefined as any
      user.loginOtpAttempts = 0
      await user.save()
      throw new BadRequestException('Too many failed verification attempts. Please request a new code.')
    }

    const inputHash = this.hashToken(dto.otp.trim())
    if (inputHash !== user.loginOtpHash) {
      user.loginOtpAttempts = (user.loginOtpAttempts || 0) + 1
      await user.save()
      throw new BadRequestException('Invalid verification code. Please check your email and try again.')
    }

    // OTP is valid — invalidate to ensure single-use
    user.loginOtpHash = undefined as any
    user.loginOtpExpiresAt = undefined as any
    user.loginOtpLastSentAt = undefined as any
    user.loginOtpAttempts = 0
    user.lastLoginAt = new Date()
    await user.save()

    return this.generateTokens(user)
  }

  async resendLoginOtp(email: string) {
    if (!email) throw new BadRequestException('Email address is required.')

    const cleanEmail = email.toLowerCase().trim()
    const user = await this.userModel.findOne({ email: cleanEmail })

    if (!user || !user.email) {
      return {
        success: true,
        message: 'If an account exists for this email, a new verification code has been sent.',
      }
    }

    // Rate limiting: 60 seconds cooldown
    if (user.loginOtpLastSentAt) {
      const secondsSince = (Date.now() - user.loginOtpLastSentAt.getTime()) / 1000
      if (secondsSince < 60) {
        throw new BadRequestException(`Please wait ${Math.ceil(60 - secondsSince)} seconds before requesting another code.`)
      }
    }

    const otp = crypto.randomInt(100000, 1000000).toString()
    user.loginOtpHash = this.hashToken(otp)
    user.loginOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000)
    user.loginOtpLastSentAt = new Date()
    user.loginOtpAttempts = 0
    await user.save()

    await this.mailService.sendLoginOtpEmail(
      `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      user.email,
      otp,
      5,
    )

    return {
      success: true,
      message: 'A new verification code has been sent to your email address.',
    }
  }

  async verifyEmail(codeOrToken: string, email?: string) {
    if (!codeOrToken) throw new BadRequestException('Verification code is required.')

    const tokenHash = this.hashToken(codeOrToken.trim())
    const query = email
      ? { email: email.toLowerCase().trim(), emailVerificationTokenHash: tokenHash }
      : { emailVerificationTokenHash: tokenHash }

    const user = await this.userModel.findOne(query)

    if (!user) {
      throw new BadRequestException('Invalid verification code. Please check your email and try again.')
    }

    if (user.emailVerificationExpiresAt && new Date() > user.emailVerificationExpiresAt) {
      throw new BadRequestException('EXPIRED: Verification code has expired. Please request a new code.')
    }

    user.emailVerified = true
    user.emailVerificationTokenHash = undefined as any
    user.emailVerificationExpiresAt = undefined as any
    user.lastLoginAt = new Date()
    await user.save()

    return {
      success: true,
      message: 'Email verified successfully!',
      ...this.generateTokens(user),
    }
  }

  async resendVerificationEmail(email: string) {
    if (!email) throw new BadRequestException('Email address is required.')

    const user = await this.userModel.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return { success: true, message: 'If an account exists for this email, a verification code has been sent.' }
    }

    if (user.emailVerified) {
      throw new BadRequestException('Your email is already verified. Please log in.')
    }

    // Rate limiting: 60 seconds cooldown
    if (user.emailVerificationLastSentAt) {
      const secondsSince = (Date.now() - user.emailVerificationLastSentAt.getTime()) / 1000
      if (secondsSince < 60) {
        throw new BadRequestException(`Please wait ${Math.ceil(60 - secondsSince)} seconds before requesting another code.`)
      }
    }

    const code = crypto.randomInt(100000, 1000000).toString()
    user.emailVerificationTokenHash = this.hashToken(code)
    user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    user.emailVerificationLastSentAt = new Date()
    await user.save()

    await this.mailService.sendVerificationEmail(
      `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      user.email,
      code,
    )

    return {
      success: true,
      message: 'Verification code sent! Please check your email inbox.',
    }
  }

  async googleLogin(dto: { credential?: string; idToken?: string; accessToken?: string }) {
    const tokenToVerify = dto.credential || dto.idToken

    if (!tokenToVerify && !dto.accessToken) {
      throw new UnauthorizedException('Google authentication credential token is required.')
    }

    let email = ''
    let firstName = ''
    let lastName = ''
    let avatarUrl = ''

    if (tokenToVerify) {
      try {
        // Verify real Google ID Token directly with Google's official OAuth2 tokeninfo API
        const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`)
        if (!res.ok) {
          throw new UnauthorizedException('Invalid or expired Google authentication token.')
        }
        const payload = await res.json()
        if (!payload.email || payload.email_verified === false) {
          throw new UnauthorizedException('Unverified Google email account.')
        }
        email = payload.email
        firstName = payload.given_name || payload.name?.split(' ')[0] || 'Google'
        lastName = payload.family_name || payload.name?.split(' ')[1] || 'User'
        avatarUrl = payload.picture || ''
        this.logger.log(`Real Google token verified successfully for: ${email}`)
      } catch (err: any) {
        this.logger.error(`Google token verification failed: ${err.message}`)
        if (err instanceof UnauthorizedException || err instanceof BadRequestException) throw err
        throw new UnauthorizedException('Failed to verify Google login token with Google servers.')
      }
    } else if (dto.accessToken) {
      try {
        // Verify Google Access Token via UserInfo API
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${dto.accessToken}` },
        })
        if (!res.ok) {
          throw new UnauthorizedException('Invalid Google access token.')
        }
        const payload = await res.json()
        if (!payload.email || payload.email_verified === false) {
          throw new UnauthorizedException('Unverified Google email account.')
        }
        email = payload.email
        firstName = payload.given_name || payload.name?.split(' ')[0] || 'Google'
        lastName = payload.family_name || payload.name?.split(' ')[1] || 'User'
        avatarUrl = payload.picture || ''
        this.logger.log(`Real Google access token verified for: ${email}`)
      } catch (err: any) {
        if (err instanceof UnauthorizedException) throw err
        throw new UnauthorizedException('Failed to verify Google access token.')
      }
    }

    const cleanEmail = email.toLowerCase().trim()
    let user = await this.userModel.findOne({ email: cleanEmail })

    if (user) {
      user.emailVerified = true
      if (avatarUrl && !user.avatarUrl) user.avatarUrl = avatarUrl
      user.lastLoginAt = new Date()
      await user.save()
    } else {
      user = await this.userModel.create({
        email: cleanEmail,
        firstName: firstName || cleanEmail.split('@')[0] || 'Google',
        lastName: lastName || 'User',
        role: 'CUSTOMER',
        emailVerified: true,
        avatarUrl: avatarUrl,
        lastLoginAt: new Date(),
      })
    }

    return this.generateTokens(user)
  }

  async forgotPassword(email: string) {
    if (!email) throw new BadRequestException('Email address is required')

    const cleanEmail = email.toLowerCase().trim()
    const user = await this.userModel.findOne({ email: cleanEmail })

    // Anti account enumeration: return success message regardless
    if (!user) {
      return {
        success: true,
        message: 'If an account exists for this email, a password reset link has been sent.',
      }
    }

    // Rate limiting: 2 minutes cooldown
    if (user.passwordResetLastSentAt) {
      const secondsSince = (Date.now() - user.passwordResetLastSentAt.getTime()) / 1000
      if (secondsSince < 120) {
        throw new BadRequestException(`Please wait ${Math.ceil(120 - secondsSince)} seconds before requesting another reset email.`)
      }
    }

    const rawToken = crypto.randomBytes(32).toString('hex')
    user.passwordResetTokenHash = this.hashToken(rawToken)
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    user.passwordResetLastSentAt = new Date()
    await user.save()

    await this.mailService.sendPasswordResetEmail(
      `${user.firstName} ${user.lastName}`,
      user.email,
      rawToken,
    )

    return {
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.',
    }
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token) throw new BadRequestException('Reset token is required')
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long')
    }

    const tokenHash = this.hashToken(token)
    const user = await this.userModel.findOne({
      passwordResetTokenHash: tokenHash,
    })

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token.')
    }

    if (user.passwordResetExpiresAt && new Date() > user.passwordResetExpiresAt) {
      throw new BadRequestException('EXPIRED: Password reset link has expired. Please request a new one.')
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10)
    user.passwordResetTokenHash = undefined as any
    user.passwordResetExpiresAt = undefined as any
    // Auto-verify email if resetting password
    user.emailVerified = true
    await user.save()

    return {
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    }
  }

  // Admin login — checks that user has ADMIN role
  async adminLogin(dto: { email: string; password: string }) {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase().trim() })
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid admin credentials')
    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid admin credentials')
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw new ForbiddenException('Access denied. Admin only.')
    }
    return this.generateTokens(user)
  }

  // Admin register — creates a user with ADMIN role
  async adminRegister(dto: { email: string; password: string; firstName: string; lastName: string }) {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase().trim() })
    if (existing) throw new ForbiddenException('Email already registered')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.userModel.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'ADMIN',
      emailVerified: true,
    })
    return this.generateTokens(user)
  }

  private async generateTokens(user: any) {
    const accessToken = this.jwt.sign({ sub: user._id.toString(), role: user.role })
    const refreshToken = this.jwt.sign({ sub: user._id.toString() }, { expiresIn: '7d' })
    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified ?? false,
      },
      tokens: { accessToken, refreshToken },
    }
  }
}
