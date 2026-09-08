import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
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

const DB_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/kebab-biteri'

@Module({
  imports: [
    MongooseModule.forRoot(DB_URL),
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
