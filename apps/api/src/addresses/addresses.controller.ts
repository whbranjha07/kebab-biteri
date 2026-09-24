import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common'
import { AddressesService } from './addresses.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser } from '../common/current-user.decorator'

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  async findAll(@CurrentUser() user: { userId: string } | null) {
    // Guests have no saved addresses — return an empty list rather than 500.
    if (!user?.userId) return []
    return this.addressesService.findAll(user.userId)
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string } | null,
    @Body() dto: {
      label?: string
      street: string
      city?: string
      postalCode?: string
      country?: string
      lat?: number
      lng?: number
      instructions?: string
      isDefault?: boolean
    },
  ) {
    if (!user?.userId) return { success: false, message: 'Login required to save addresses' }
    return this.addressesService.create(user.userId, dto)
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { userId: string } | null,
    @Param('id') id: string,
    @Body() dto: Partial<{
      label: string
      street: string
      city: string
      postalCode: string
      instructions: string
      isDefault: boolean
    }>,
  ) {
    if (!user?.userId) return { success: false, message: 'Login required' }
    return this.addressesService.update(user.userId, id, dto)
  }

  @Delete(':id')
  async remove(@CurrentUser() user: { userId: string } | null, @Param('id') id: string) {
    if (!user?.userId) return { success: false, message: 'Login required' }
    return this.addressesService.remove(user.userId, id)
  }
}
