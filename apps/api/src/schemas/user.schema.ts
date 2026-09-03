import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type UserDocument = User & Document

@Schema({ _id: false })
export class FcmTokenEntry {
  @Prop({ required: true })
  token: string

  @Prop()
  deviceInfo: string

  @Prop({ default: Date.now })
  registeredAt: Date
}

export const FcmTokenEntrySchema = SchemaFactory.createForClass(FcmTokenEntry)

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true, sparse: true })
  email: string

  @Prop({ unique: true, sparse: true })
  phone: string

  @Prop()
  passwordHash: string

  @Prop({ required: true })
  firstName: string

  @Prop({ required: true })
  lastName: string

  @Prop({ enum: ['CUSTOMER', 'ADMIN', 'MANAGER', 'KITCHEN', 'DELIVERY'], default: 'CUSTOMER' })
  role: string

  @Prop()
  avatarUrl: string

  @Prop({ default: false })
  marketingConsent: boolean

  // Legacy single-token field — kept for backward compatibility
  @Prop()
  fcmToken: string

  // Multi-device support — a user can be logged in on multiple devices
  @Prop({ type: [FcmTokenEntrySchema], default: [] })
  fcmTokens: FcmTokenEntry[]

  @Prop({ default: true })
  isActive: boolean

  @Prop()
  lastLoginAt: Date

  @Prop()
  deletedAt: Date
}

export const UserSchema = SchemaFactory.createForClass(User)
