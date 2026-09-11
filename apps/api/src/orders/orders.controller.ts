import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common'
import { OrdersService } from './orders.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser } from '../common/current-user.decorator'
import { CreateOrderDto } from '../dto/create-order.dto'
import { PaginationDto } from '../dto/pagination.dto'
import { OrderStatus } from '@kebab-biteri/types'

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(@CurrentUser() user: { userId: string } | null, @Body() dto: CreateOrderDto) {
    // Guest checkout supported: user may be null when no JWT was sent.
    return this.ordersService.create(user?.userId ?? null, dto)
  }

  @Get()
  async findAll(@CurrentUser() user: { userId: string }, @Query() query: PaginationDto) {
    if (!user?.userId) return { data: [], total: 0 }
    return this.ordersService.findByUser(user.userId, query.page, query.limit)
  }

  @Get(':id')
  async findOne(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    if (!user?.userId) return null
    return this.ordersService.findOne(user.userId, id)
  }

  @Post(':id/cancel')
  async cancel(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.ordersService.cancel(user.userId, id)
  }
}
