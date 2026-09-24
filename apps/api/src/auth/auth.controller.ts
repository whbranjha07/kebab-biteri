import { Controller, Post, Get, Body, Query, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { RolesGuard } from '../common/roles.guard'
import { Roles } from '../common/roles.decorator'
import { Role } from '@kebab-biteri/types'
import { FirebaseService } from '../firebase/firebase.service'

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private firebase: FirebaseService,
  ) {}

  // Mint a Firebase custom token for the currently-logged-in user so the web
  // client can sign into Firebase Auth and subscribe to Firestore realtime
  // event feeds under a rule-checked identity. Admin/manager/kitchen roles
  // get an `admin: true` claim that unlocks the shared admin_events feed.
  @Post('firebase-token')
  @UseGuards(JwtAuthGuard)
  async firebaseToken(@Request() req: any) {
    const auth = this.firebase.auth
    if (!auth) {
      throw new HttpException(
        'Realtime service is not configured on this deployment.',
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }
    const userId: string | undefined = req.user?.userId
    const role: string | undefined = req.user?.role
    if (!userId) {
      throw new HttpException('Not authenticated', HttpStatus.UNAUTHORIZED)
    }
    const isAdmin = role === 'ADMIN' || role === 'MANAGER' || role === 'KITCHEN'
    try {
      const token = await auth.createCustomToken(userId, { admin: isAdmin, role: role ?? 'CUSTOMER' })
      return { token, admin: isAdmin }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new HttpException(`Failed to mint Firebase token: ${msg}`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('register')
  async register(@Body() body: { email?: string; phone?: string; password: string; firstName: string; lastName: string }) {
    return this.authService.register(body)
  }

  @Post('login')
  async login(@Body() body: { email?: string; phone?: string; password: string }) {
    return this.authService.login(body)
  }

  @Post('verify-login-otp')
  async verifyLoginOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyLoginOtp(body)
  }

  @Post('resend-login-otp')
  async resendLoginOtp(@Body() body: { email: string }) {
    return this.authService.resendLoginOtp(body.email)
  }

  @Post('verify-email')
  async verifyEmailPost(@Body() body: { email?: string; code?: string; token?: string }) {
    const codeOrToken = body.code || body.token || ''
    return this.authService.verifyEmail(codeOrToken, body.email)
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Query('code') code?: string, @Query('email') email?: string) {
    return this.authService.verifyEmail(code || token, email)
  }

  @Post('resend-verification')
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerificationEmail(body.email)
  }

  @Post('google')
  async googleLogin(@Body() body: { credential?: string; idToken?: string; accessToken?: string }) {
    return this.authService.googleLogin(body)
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email)
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password)
  }

  // Admin-only login — checks ADMIN/MANAGER role
  @Post('admin/login')
  async adminLogin(@Body() body: { email: string; password: string }) {
    return this.authService.adminLogin(body)
  }

  // Admin registration — only an existing ADMIN may provision another admin.
  // Bootstrap the very first admin via `pnpm --filter @kebab-biteri/api seed`
  // or by inserting a User with role: 'ADMIN' directly in the DB.
  @Post('admin/register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async adminRegister(@Body() body: { email: string; password: string; firstName: string; lastName: string }) {
    return this.authService.adminRegister(body)
  }
}
