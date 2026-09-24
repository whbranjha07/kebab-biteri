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
import { OptionalJwtAuthGuard } from '../common/optional-jwt-auth.guard'
import { CurrentUser } from '../common/current-user.decorator'
import { CreateOrderDto } from '../dto/create-order.dto'
import { PaginationDto } from '../dto/pagination.dto'
import { OrderStatus } from '@kebab-biteri/types'

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Guest checkout supported — token is optional here.
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async create(@CurrentUser() user: { userId: string } | null, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user?.userId ?? null, dto)
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() user: { userId: string }, @Query() query: PaginationDto) {
    return this.ordersService.findByUser(user.userId, query.page, query.limit)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.ordersService.findOne(user.userId, id)
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.ordersService.cancel(user.userId, id)
  }
}
