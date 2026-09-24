import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { RolesGuard } from '../common/roles.guard'
import { Roles } from '../common/roles.decorator'
import { CurrentUser } from '../common/current-user.decorator'
import { Role, OrderStatus } from '@kebab-biteri/types'
import { PaginationDto } from '../dto/pagination.dto'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Orders ───────────────────────────────────────
  @Get('orders')
  async getOrders(
    @Query() query: PaginationDto,
    @Query('status') status?: OrderStatus,
    @Query('branchId') branchId?: string,
  ) {
    return this.adminService.getOrders(query.page, query.limit, status, branchId)
  }

  @Patch('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: OrderStatus },
    @CurrentUser() user: { userId: string },
  ) {
    return this.adminService.updateOrderStatus(id, body.status, user.userId)
  }

  // ─── Products ─────────────────────────────────────
  @Get('products')
  async getProducts() {
    return this.adminService.getProducts()
  }

  @Post('products')
  async createProduct(@Body() body: {
    name: string
    description: string
    imageUrl: string
    categoryId: string
    basePrice: number
    isPopular?: boolean
    allergens?: string[]
    calories?: number
  }) {
    return this.adminService.createProduct(body)
  }

  @Patch('products/:id')
  async updateProduct(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.adminService.updateProduct(id, body)
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id)
  }

  // ─── Categories ───────────────────────────────────
  @Get('categories')
  async getCategories() {
    return this.adminService.getAllCategories()
  }

  @Post('categories')
  async createCategory(@Body() body: { name: string; sortOrder?: number; iconUrl?: string }) {
    return this.adminService.createCategory(body)
  }

  @Patch('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.adminService.updateCategory(id, body)
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id)
  }


  // ─── Coupons ──────────────────────────────────────
  @Post('coupons')
  async createCoupon(@Body() body: {
    code: string
    type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY'
    value: number
    minOrderAmount?: number
    maxUses?: number
    startsAt?: string
    endsAt?: string
  }) {
    return this.adminService.createCoupon(body)
  }

  // ─── Promotions ───────────────────────────────────
  @Post('promotions')
  async createPromotion(@Body() body: {
    title: string
    subtitle: string
    imageUrl: string
    badgeText?: string
    linkUrl?: string
    sortOrder?: number
  }) {
    return this.adminService.createPromotion(body)
  }

  // ─── Analytics ────────────────────────────────────
  @Get('analytics')
  async getAnalytics(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getAnalytics(from, to)
  }

  // ─── Customers ────────────────────────────────────
  @Get('customers')
  async getCustomers(@Query() query: PaginationDto) {
    return this.adminService.getCustomers(query.page, query.limit)
  }

  // ─── POS Billing ──────────────────────────────────
  @Post('billing/orders')
  async createBillingOrder(
    @Body() body: {
      userId?: string
      customerName?: string
      customerPhone?: string
      orderType: string
      items: Array<{ productId: string; variantName?: string; quantity: number; notes?: string }>
      paymentMethod: string
      amountReceived?: number
      discount?: number
      tax?: number
    },
    @CurrentUser() user?: { userId?: string },
  ) {
    return this.adminService.createBillingOrder(body, user?.userId || '')
  }

  @Get('billing/history')
  async getBillingHistory(
    @Query() query: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.adminService.getBillingHistory(query.page, query.limit, search)
  }

  @Get('billing/receipt/:orderId')
  async getReceiptData(@Param('orderId') orderId: string) {
    return this.adminService.getReceiptData(orderId)
  }

  @Post('billing/print-test')
  async printTestReceipt() {
    return this.adminService.printTestReceipt()
  }

  // ─── Store & Printer Settings ─────────────────────
  @Get('settings')
  async getSettings() {
    return this.adminService.getSettings()
  }

  @Patch('settings')
  async updateSettings(@Body() body: Record<string, unknown>) {
    return this.adminService.updateSettings(body)
  }
}
