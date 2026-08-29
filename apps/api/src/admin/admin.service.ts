import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Order, Product, Category, Branch, Coupon, Promotion, User, StoreSettings } from '../schemas'
import { OrdersService } from '../orders/orders.service'

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(Coupon.name) private couponModel: Model<Coupon>,
    @InjectModel(Promotion.name) private promotionModel: Model<Promotion>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(StoreSettings.name) private settingsModel: Model<StoreSettings>,
    private ordersService: OrdersService,
  ) {}

  async getOrders(page = 1, limit = 20, status?: string, branchId?: string) {
    const filter: Record<string, unknown> = {}
    if (status) filter.status = status
    if (branchId) filter.branchId = new Types.ObjectId(branchId)
    const skip = (page - 1) * limit
    const orders = await this.orderModel.find(filter).sort({ placedAt: -1 }).skip(skip).limit(limit).populate("userId", "firstName lastName email phone").lean()
    const total = await this.orderModel.countDocuments(filter)
    return { data: orders, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async updateOrderStatus(orderId: string, status: string, userId: string) {
    return this.ordersService.updateStatus(orderId, status, userId)
  }

  async getProducts() {
    return this.productModel.find({ deletedAt: null }).lean()
  }

  async createProduct(body: any) {
    return this.productModel.create({ ...body, slug: slugify(body.name) + '-' + Date.now().toString(36) })
  }

  async updateProduct(id: string, body: any) {
    const product = await this.productModel.findById(id)
    if (!product) throw new NotFoundException('Producto no encontrado')
    Object.assign(product, body)
    await product.save()
    return product
  }

  async deleteProduct(id: string) {
    return this.productModel.findByIdAndUpdate(id, { deletedAt: new Date(), isActive: false }, { new: true })
  }

  async createCategory(body: any) {
    return this.categoryModel.create({ ...body, slug: slugify(body.name) + '-' + Date.now().toString(36) })
  }

  async updateCategory(id: string, body: any) {
    return this.categoryModel.findByIdAndUpdate(id, body, { new: true })
  }

  async createCoupon(body: any) {
    const existing = await this.couponModel.findOne({ code: body.code })
    if (existing) throw new ConflictException('Este código de cupón ya existe')
    return this.couponModel.create(body)
  }

  async createPromotion(body: any) {
    return this.promotionModel.create(body)
  }

  async getAnalytics(from?: string, to?: string) {
    const dateFilter: Record<string, unknown> = {}
    if (from || to) {
      dateFilter.placedAt = {}
      if (from) (dateFilter.placedAt as any).$gte = new Date(from)
      if (to) (dateFilter.placedAt as any).$lte = new Date(to)
    }

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - 7)

    const startOfMonth = new Date()
    startOfMonth.setDate(startOfMonth.getDate() - 30)

    const [
      totalOrders,
      revenueResult,
      todayRevenueResult,
      weeklyRevenueResult,
      monthlyRevenueResult,
      statusCounts,
      totalCustomers,
      topProductsAgg,
      recentOrders,
    ] = await Promise.all([
      this.orderModel.countDocuments(dateFilter),
      this.orderModel.aggregate([
        { $match: { ...dateFilter, status: { $nin: ['CANCELLED', 'REJECTED'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.orderModel.aggregate([
        { $match: { placedAt: { $gte: startOfToday }, status: { $nin: ['CANCELLED', 'REJECTED'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.orderModel.aggregate([
        { $match: { placedAt: { $gte: startOfWeek }, status: { $nin: ['CANCELLED', 'REJECTED'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.orderModel.aggregate([
        { $match: { placedAt: { $gte: startOfMonth }, status: { $nin: ['CANCELLED', 'REJECTED'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.orderModel.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.userModel.countDocuments({ role: 'CUSTOMER', deletedAt: null }),
      this.orderModel.aggregate([
        { $unwind: '$items' },
        { $group: { _id: '$items.productName', totalQuantity: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.lineTotal' } } },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
      ]),
      this.orderModel.find().sort({ placedAt: -1 }).limit(10).lean(),
    ])

    const totalRevenue = revenueResult[0]?.total ?? 0
    const todayRevenue = todayRevenueResult[0]?.total ?? 0
    const weeklyRevenue = weeklyRevenueResult[0]?.total ?? 0
    const monthlyRevenue = monthlyRevenueResult[0]?.total ?? 0

    return {
      totalOrders,
      totalRevenue,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      totalCustomers,
      ordersByStatus: statusCounts.reduce((acc: Record<string, number>, s: any) => { acc[s._id] = s.count; return acc }, {}),
      topProducts: topProductsAgg.map((p) => ({ name: p._id, count: p.totalQuantity, revenue: p.totalRevenue })),
      recentOrders,
    }
  }

  async getCustomers(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const users = await this.userModel
      .find({ role: 'CUSTOMER', deletedAt: null })
      .select('firstName lastName email phone createdAt lastLoginAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
    const total = await this.userModel.countDocuments({ role: 'CUSTOMER', deletedAt: null })
    return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getSettings() {
    let settings = await this.settingsModel.findOne().lean()
    if (!settings) {
      settings = await this.settingsModel.create({})
    }
    return settings
  }

  async updateSettings(body: Record<string, unknown>) {
    let settings = await this.settingsModel.findOne()
    if (!settings) {
      settings = await this.settingsModel.create(body)
    } else {
      Object.assign(settings, body)
      await settings.save()
    }
    return settings
  }
}
