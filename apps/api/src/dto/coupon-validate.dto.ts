import { IsString, IsNumber, Min } from '../common/class-validator'

export class CouponValidateDto {
  @IsString()
  code: string

  @IsNumber()
  @Min(0)
  subtotal: number
}
