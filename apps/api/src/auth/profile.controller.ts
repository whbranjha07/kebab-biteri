import { Controller, Get, Patch, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User } from '../schemas'

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  @Get()
  async getProfile(@Request() req: any) {
    const user = await this.userModel.findById(req.user.userId).lean()
    if (!user) return { user: null }
    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        favorites: user.favorites ?? [],
        notificationPreferences: user.notificationPreferences ?? {
          orderUpdates: true,
          promotional: true,
          specialOffers: true,
          push: true,
          email: true,
        },
        themePreference: user.themePreference ?? 'light',
        languagePreference: user.languagePreference ?? 'es-ES',
      },
    }
  }

  @Patch()
  async updateProfile(@Request() req: any, @Body() body: any) {
    const user = await this.userModel.findByIdAndUpdate(
      req.user.userId,
      { $set: body },
      { new: true },
    ).lean()
    return { user }
  }

  @Get('favorites')
  async getFavorites(@Request() req: any) {
    const user = await this.userModel.findById(req.user.userId).lean()
    return { favorites: user?.favorites ?? [] }
  }

  @Post('favorites/:productId')
  async addFavorite(@Request() req: any, @Param('productId') productId: string) {
    const user = await this.userModel.findByIdAndUpdate(
      req.user.userId,
      { $addToSet: { favorites: productId } },
      { new: true },
    ).lean()
    return { favorites: user?.favorites ?? [] }
  }

  @Delete('favorites/:productId')
  async removeFavorite(@Request() req: any, @Param('productId') productId: string) {
    const user = await this.userModel.findByIdAndUpdate(
      req.user.userId,
      { $pull: { favorites: productId } },
      { new: true },
    ).lean()
    return { favorites: user?.favorites ?? [] }
  }
}
