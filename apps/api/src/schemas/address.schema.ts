import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type AddressDocument = Address & Document

@Schema({ timestamps: true })
export class Address {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId

  @Prop({ default: 'Dirección' })
  label: string

  @Prop({ required: true })
  street: string

  @Prop({ default: '' })
  city: string

  // Optional — Spanish postal codes exist but aren't required for local delivery.
  @Prop({ default: '' })
  postalCode: string

  @Prop({ default: 'España' })
  country: string

  @Prop({ default: 0 })
  lat: number

  @Prop({ default: 0 })
  lng: number

  @Prop()
  instructions: string

  @Prop({ default: false })
  isDefault: boolean
}

export const AddressSchema = SchemaFactory.createForClass(Address)
