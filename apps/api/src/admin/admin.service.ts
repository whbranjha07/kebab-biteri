import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Order, Product, Category, Branch, Coupon, Promotion, User } from '../schemas'
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

    const totalOrders = await this.orderModel.countDocuments(dateFilter)
    const revenueResult = await this.orderModel.aggregate([
      { $match: { ...dateFilter, status: { $nin: ['CANCELLED', 'REJECTED'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ])
    const totalRevenue = revenueResult[0]?.total ?? 0
    const statusCounts = await this.orderModel.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    const recentOrders = await this.orderModel.find().sort({ placedAt: -1 }).limit(10).lean()
    
    return {
      totalOrders,
      totalRevenue,
      ordersByStatus: statusCounts.reduce((acc: Record<string, number>, s: any) => { acc[s._id] = s.count; return acc }, {}),
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

  // ─── POS Billing Logic ─────────────────────────────
  async createBillingOrder(
    body: {
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
    cashierId: string,
  ) {
    if (!body.items || body.items.length === 0) {
      throw new ConflictException('El carrito de facturación no puede estar vacío')
    }

    let cashierName = 'Admin Cashier'
    if (cashierId && Types.ObjectId.isValid(cashierId)) {
      const cashierUser = await this.userModel.findById(cashierId).lean()
      if (cashierUser) cashierName = `${cashierUser.firstName} ${cashierUser.lastName}`
    }

    const settings = await this.getSettings()
    const prefix = settings.receiptPrefix || 'KB-'

    // Generate unique sequential receipt number
    const count = await this.orderModel.countDocuments({ receiptNumber: { $ne: null } })
    const receiptNumber = `${prefix}${(count + 1).toString().padStart(6, '0')}`
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`

    // Lookup customer or set default Walk-in
    let targetUserId = body.userId
    let customerName = body.customerName || 'Walk-in Customer'
    let customerPhone = body.customerPhone || ''

    if (targetUserId && Types.ObjectId.isValid(targetUserId)) {
      const dbCustomer = await this.userModel.findById(targetUserId).lean()
      if (dbCustomer) {
        customerName = `${dbCustomer.firstName} ${dbCustomer.lastName}`
        customerPhone = dbCustomer.phone || customerPhone
      }
    } else {
      // Find or create default walk-in customer user
      let walkInUser = await this.userModel.findOne({ email: 'walkin@kebabbiteri.com' })
      if (!walkInUser) {
        walkInUser = await this.userModel.create({
          firstName: 'Walk-in',
          lastName: 'Customer',
          email: 'walkin@kebabbiteri.com',
          role: 'CUSTOMER',
          isActive: true,
        })
      }
      targetUserId = walkInUser._id.toString()
    }

    // Default branch
    let branch = await this.branchModel.findOne().lean()
    if (!branch) {
      branch = await this.branchModel.create({
        name: 'Kebab Biteri Main Branch',
        slug: 'main-branch',
        street: 'Calle Mayor 12',
        city: 'Madrid',
        postalCode: '28001',
        lat: 40.4168,
        lng: -3.7038,
        phone: '+34 912 345 678',
      })
    }
    const branchId = branch._id

    // Validate products & recalculate prices strictly on backend
    let subtotal = 0
    const orderItems = []

    for (const item of body.items) {
      let product: any = null
      if (item.productId && Types.ObjectId.isValid(item.productId)) {
        product = await this.productModel.findById(item.productId).lean()
      }
      
      // Fallback search by slug or name if static ID passed
      if (!product) {
        product = await this.productModel.findOne({
          $or: [{ id: item.productId }, { _id: item.productId }, { slug: item.productId }]
        }).lean()
      }

      let productName = product?.name || item.productId || 'Menu Product'
      let unitPrice = product?.basePrice ?? 5.00
      let variantName = item.variantName

      if (variantName && product?.variants && product.variants.length > 0) {
        const matchedVariant = product.variants.find((v: any) => v.name === variantName)
        if (matchedVariant) {
          unitPrice = matchedVariant.price
        }
      }

      const qty = Math.max(1, item.quantity)
      const lineTotal = unitPrice * qty
      subtotal += lineTotal

      orderItems.push({
        productId: product?._id || new Types.ObjectId(),
        productName,
        variantName: variantName || null,
        unitPrice,
        quantity: qty,
        lineTotal,
        notes: item.notes || null,
        modifiersJson: [],
      })
    }

    const discountAmount = Math.max(0, body.discount || 0)
    const taxAmount = Math.max(0, body.tax || 0)
    const total = Math.max(0, subtotal - discountAmount + taxAmount)

    let amountReceived = body.amountReceived || total
    let changeAmount = 0
    if (body.paymentMethod === 'CASH') {
      amountReceived = Math.max(total, body.amountReceived || total)
      changeAmount = Math.max(0, amountReceived - total)
    }

    const createdOrder = await this.orderModel.create({
      orderNumber,
      receiptNumber,
      userId: new Types.ObjectId(targetUserId),
      customerName,
      customerPhone,
      branchId,
      status: 'DELIVERED',
      orderType: body.orderType || 'TAKEAWAY',
      subtotal,
      deliveryFee: 0,
      discount: discountAmount,
      tax: taxAmount,
      total,
      amountReceived,
      changeAmount,
      cashierId,
      cashierName,
      paymentStatus: 'PAID',
      paymentMethod: body.paymentMethod || 'CASH',
      paidAt: new Date(),
      placedAt: new Date(),
      deliveredAt: new Date(),
      items: orderItems,
    })

    return {
      order: createdOrder,
      receipt: {
        receiptNumber,
        orderNumber,
        date: new Date().toLocaleDateString('es-ES'),
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        restaurantName: settings.storeName || 'KEBAB BITERI',
        address: settings.address || 'Calle Mayor 12, Madrid',
        phone: settings.phone1 || '+34 912 345 678',
        email: settings.email || 'info@kebabbiteri.com',
        customerName,
        orderType: body.orderType || 'TAKEAWAY',
        cashierName,
        items: orderItems.map((i) => ({ name: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, total: i.lineTotal })),
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total,
        paymentMethod: body.paymentMethod || 'CASH',
        amountReceived,
        changeAmount,
        headerText: settings.receiptHeaderText || 'BIENVENIDO A KEBAB BITERI',
        footerText: settings.receiptFooterText || '¡GRACIAS POR SU VISITA!',
        paperSize: settings.printerPaperSize || '80mm',
        openCashDrawer: settings.openCashDrawerOnCash && body.paymentMethod === 'CASH',
      },
    }
  }

  async getBillingHistory(page = 1, limit = 20, search?: string) {
    const filter: Record<string, unknown> = { receiptNumber: { $ne: null } }
    if (search) {
      filter.$or = [
        { receiptNumber: new RegExp(search, 'i') },
        { orderNumber: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
      ]
    }
    const skip = (page - 1) * limit
    const orders = await this.orderModel.find(filter).sort({ placedAt: -1 }).skip(skip).limit(limit).lean()
    const total = await this.orderModel.countDocuments(filter)
    return { data: orders, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getReceiptData(orderId: string) {
    const order = await this.orderModel.findById(orderId).lean()
    if (!order) throw new NotFoundException('Factura no encontrada')

    const settings = await this.getSettings()

    return {
      receiptNumber: order.receiptNumber || `KB-${order.orderNumber}`,
      orderNumber: order.orderNumber,
      date: new Date(order.placedAt || Date.now()).toLocaleDateString('es-ES'),
      time: new Date(order.placedAt || Date.now()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      restaurantName: settings.storeName || 'KEBAB BITERI',
      address: settings.address || 'Calle Mayor 12, Madrid',
      phone: settings.phone1 || '+34 912 345 678',
      email: settings.email || 'info@kebabbiteri.com',
      customerName: order.customerName || 'Walk-in Customer',
      orderType: order.orderType || 'TAKEAWAY',
      cashierName: order.cashierName || 'Admin',
      items: (order.items || []).map((i: any) => ({
        name: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.lineTotal,
      })),
      subtotal: order.subtotal,
      discount: order.discount || 0,
      tax: order.tax || 0,
      total: order.total,
      paymentMethod: order.paymentMethod || 'CASH',
      amountReceived: order.amountReceived,
      changeAmount: order.changeAmount,
      headerText: settings.receiptHeaderText || 'BIENVENIDO A KEBAB BITERI',
      footerText: settings.receiptFooterText || '¡GRACIAS POR SU VISITA!',
      paperSize: settings.printerPaperSize || '80mm',
      openCashDrawer: settings.openCashDrawerOnCash && order.paymentMethod === 'CASH',
    }
  }

  async printTestReceipt() {
    const settings = await this.getSettings()
    return {
      success: true,
      testReceipt: {
        receiptNumber: 'TEST-0000',
        orderNumber: 'TEST-01',
        date: new Date().toLocaleDateString('es-ES'),
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        restaurantName: settings.storeName || 'KEBAB BITERI',
        address: settings.address || 'Calle Mayor 12, Madrid',
        phone: settings.phone1 || '+34 912 345 678',
        customerName: 'Prueba de Impresora',
        orderType: 'PRUEBA',
        cashierName: 'Sistema',
        items: [
          { name: 'Prueba Térmica 80mm', quantity: 1, unitPrice: 0, total: 0 },
          { name: 'Conexión Correcta', quantity: 1, unitPrice: 0, total: 0 },
        ],
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
        paymentMethod: 'TEST',
        headerText: '=== PRUEBA DE IMPRESORA TÉRMICA ===',
        footerText: '=== IMPRESORA CONECTADA Y OPERATIVA ===',
        paperSize: settings.printerPaperSize || '80mm',
        openCashDrawer: settings.openCashDrawerOnCash,
      },
    }
  }
}

