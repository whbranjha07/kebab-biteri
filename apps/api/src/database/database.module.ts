import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigModule, ConfigService } from '@nestjs/config'
import {
  UserSchema,
  CategorySchema,
  ProductSchema,
  BranchSchema,
  PromotionSchema,
  OrderSchema,
  CouponSchema,
  AddressSchema,
  NotificationSchema,
  StoreSettingsSchema,
} from '../schemas'

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUri =
          configService.get<string>('DATABASE_URL') ||
          configService.get<string>('MONGODB_URI') ||
          'mongodb+srv://Vercel-Admin-atlas-cobalt-book:atJv8Vb9EtQ93072@atlas-cobalt-book.ml4demu.mongodb.net/kebab-biteri?retryWrites=true&w=majority'
        return {
          uri: dbUri,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
        }
      },
    }),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Category', schema: CategorySchema },
      { name: 'Product', schema: ProductSchema },
      { name: 'Branch', schema: BranchSchema },
      { name: 'Promotion', schema: PromotionSchema },
      { name: 'Order', schema: OrderSchema },
      { name: 'Coupon', schema: CouponSchema },
      { name: 'Address', schema: AddressSchema },
      { name: 'Notification', schema: NotificationSchema },
      { name: 'StoreSettings', schema: StoreSettingsSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
