import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type StoreSettingsDocument = StoreSettings & Document

@Schema({ timestamps: true })
export class StoreSettings {
  @Prop({ default: 'Kebab Biteri' })
  storeName: string

  @Prop({ default: 'Auténtico Kebab & Parrilla' })
  tagline: string

  @Prop({ default: '/icons/icon-512.png' })
  logoUrl: string

  @Prop({ default: '+34 943 00 00 00' })
  phone1: string

  @Prop({ default: '+34 600 00 00 00' })
  phone2: string

  @Prop({ default: 'info@kebabbiteri.com' })
  email: string

  @Prop({ default: 'Calle Gran Vía 45, Madrid' })
  address: string

  @Prop({ default: 11.0 })
  minOrderAmount: number

  @Prop({ default: 2.5 })
  deliveryFee: number

  @Prop({ default: 11.0 })
  freeDeliveryThreshold: number

  @Prop({ default: '12:30 - 23:30' })
  openingHours: string

  @Prop({ default: 'es-ES' })
  defaultLanguage: string

  @Prop({ default: 'EUR' })
  currency: string

  @Prop({ default: '€' })
  currencySymbol: string

  @Prop({ default: true })
  ordersEnabled: boolean

  @Prop({ default: true })
  adminEmailNotifications: boolean
}

export const StoreSettingsSchema = SchemaFactory.createForClass(StoreSettings)
