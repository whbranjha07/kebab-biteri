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

  // Thermal Printer Settings
  @Prop({ default: 'Kebab Biteri Counter Printer' })
  printerName: string

  @Prop({ default: 'BRIDGE' })
  printerConnectionType: string // USB, LAN, BRIDGE

  @Prop({ default: '80mm' })
  printerPaperSize: string // 58mm, 80mm

  @Prop({ default: '192.168.1.100' })
  printerIp: string

  @Prop({ default: 9100 })
  printerPort: number

  @Prop({ default: 'http://localhost:9123' })
  printerBridgeUrl: string

  @Prop({ default: true })
  autoPrintReceipt: boolean

  @Prop({ default: 1 })
  printerCopies: number

  @Prop({ default: true })
  openCashDrawerOnCash: boolean

  @Prop({ default: 'KB-' })
  receiptPrefix: string

  @Prop({ default: 'BIENVENIDO A KEBAB BITERI' })
  receiptHeaderText: string

  @Prop({ default: '¡GRACIAS POR SU VISITA!' })
  receiptFooterText: string
}

export const StoreSettingsSchema = SchemaFactory.createForClass(StoreSettings)
