import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { User } from '../schemas'
import { NotificationsService } from '../notifications/notifications.service'

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    @InjectModel('User') private userModel: Model<User>,
    private notificationsService: NotificationsService,
  ) {}

  @Get()
  async getProfile(@Request() req: any) {
    const userId = req.user?.userId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return { user: null }
    }
    const user = await this.userModel.findById(userId).lean()
    if (!user) return { user: null }
    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        hasFcmTokens: (user.fcmTokens?.length ?? 0) > 0 || !!user.fcmToken,
      },
    }
  }

  @Patch()
  async updateProfile(
    @Request() req: any,
    @Body() body: { firstName?: string; lastName?: string; themePreference?: string },
  ) {
    const userId = req.user?.userId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return { success: false, message: 'Invalid user' }
    }
    const updateData: Record<string, any> = {}
    if (body.firstName !== undefined) updateData.firstName = body.firstName
    if (body.lastName !== undefined) updateData.lastName = body.lastName
    if (body.themePreference !== undefined) updateData.themePreference = body.themePreference

    const updatedUser = await this.userModel.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).lean()
    return { success: true, user: updatedUser }
  }

  // ─── FCM Token Registration ─────────────────────────

  @Patch('fcm-token')
  async registerFcmToken(
    @Request() req: any,
    @Body() body: { token: string; deviceInfo?: string },
  ) {
    if (!body?.token) {
      return { success: false, message: 'Token is required' }
    }
    await this.notificationsService.registerFcmToken(
      req.user.userId,
      body.token,
      body.deviceInfo,
    )
    return { success: true }
  }

  @Patch('fcm-token/remove')
  async unregisterFcmToken(
    @Request() req: any,
    @Body() body: { token: string },
  ) {
    if (!body?.token) {
      return { success: false, message: 'Token is required' }
    }
    await this.notificationsService.unregisterFcmToken(req.user.userId, body.token)
    return { success: true }
  }
}
