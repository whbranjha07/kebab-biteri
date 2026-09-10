import { Controller, Post, Get, Body, Query } from '@nestjs/common'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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

  // Admin registration — creates ADMIN role user
  @Post('admin/register')
  async adminRegister(@Body() body: { email: string; password: string; firstName: string; lastName: string }) {
    return this.authService.adminRegister(body)
  }
}
