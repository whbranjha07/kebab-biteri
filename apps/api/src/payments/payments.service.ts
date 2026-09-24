import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Order } from '../schemas'
import { WebsocketGateway } from '../websockets/websocket.gateway'
import { NotificationsService } from '../notifications/notifications.service'
import type { CreatePaymentDto } from '../dto/create-payment.dto'
import {
  generateRedsysOrderId,
  getGatewayUrl,
  paymethodFilter,
  signMerchantParams,
  verifyNotification,
  type RedsysMerchantParams,
} from './redsys'

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(
    @InjectModel('Order') private orderModel: Model<Order>,
    private wsGateway: WebsocketGateway,
    private notificationsService: NotificationsService,
  ) {}

  async createPayment(dto: CreatePaymentDto) {
    const order = await this.orderModel.findById(dto.orderId).lean()
    if (!order) throw new NotFoundException('Pedido no encontrado')
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('El pedido ya está pagado')
    }

    // ─── Create payment intent ────────────────────
    // In production: call Stripe/Redsys/Bizum API here.
    // For now, generate a provider reference so the client can confirm.
    const providerRef = `pi_${Date.now()}`
    const clientSecret = `${providerRef}_secret`

    await this.orderModel.updateOne(
      { _id: order._id },
      {
        paymentStatus: 'PROCESSING',
        paymentMethod: dto.method,
        paymentProviderRef: providerRef,
        paymentClientSecret: clientSecret,
      },
    )

    return {
      paymentId: order._id.toString(),
      orderId: order._id.toString(),
      clientSecret,
      provider: 'stripe',
      status: 'PROCESSING',
      amount: order.total,
      currency: 'EUR',
    }
  }

  async verifyPayment(orderId: string) {
    const order = await this.orderModel.findById(orderId).lean()
    if (!order) throw new NotFoundException('Pago no encontrado')

    return {
      paymentId: order._id.toString(),
      orderId: order._id.toString(),
      status: order.paymentStatus || 'PENDING',
      amount: order.total,
      currency: 'EUR',
    }
  }

  // ─── Banco Sabadell (Redsys TPV Virtual) ─────────
  // Returns the gateway URL plus signed form fields. The web client
  // auto-submits this form so the customer lands on Sabadell's hosted
  // payment page (cards / Bizum / Apple Pay / Google Pay).
  async createSabadellPayment(orderId: string, method: string) {
    const order = await this.orderModel.findById(orderId).lean()
    if (!order) throw new NotFoundException('Pedido no encontrado')
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('El pedido ya está pagado')
    }

    const merchantCode = process.env.SABADELL_MERCHANT_CODE
    const terminal = process.env.SABADELL_TERMINAL || '001'
    const merchantKey = process.env.SABADELL_SECRET_KEY
    const currency = process.env.SABADELL_CURRENCY || '978' // EUR
    const merchantName = process.env.SABADELL_MERCHANT_NAME || 'Kebab Biteri'
    const publicApiUrl = process.env.PUBLIC_API_URL || 'http://localhost:3001/api'
    const publicWebUrl = process.env.PUBLIC_WEB_URL || 'http://localhost:3000'
    const env = process.env.SABADELL_ENV || 'test'

    if (!merchantCode || !merchantKey) {
      throw new BadRequestException(
        'Sabadell no está configurado. Añade SABADELL_MERCHANT_CODE y SABADELL_SECRET_KEY.',
      )
    }

    const redsysOrderId = generateRedsysOrderId()
    const amountCents = Math.round(order.total * 100).toString()

    const params: RedsysMerchantParams = {
      DS_MERCHANT_MERCHANTCODE: merchantCode,
      DS_MERCHANT_TERMINAL: terminal,
      DS_MERCHANT_TRANSACTIONTYPE: '0',
      DS_MERCHANT_AMOUNT: amountCents,
      DS_MERCHANT_CURRENCY: currency,
      DS_MERCHANT_ORDER: redsysOrderId,
      DS_MERCHANT_MERCHANTNAME: merchantName,
      DS_MERCHANT_PRODUCTDESCRIPTION: `Pedido ${order.orderNumber}`,
      DS_MERCHANT_CONSUMERLANGUAGE: '1',
      DS_MERCHANT_MERCHANTURL: `${publicApiUrl}/payments/sabadell/notification`,
      DS_MERCHANT_URLOK: `${publicWebUrl}/payments/result/${order._id}?status=ok`,
      DS_MERCHANT_URLKO: `${publicWebUrl}/payments/result/${order._id}?status=ko`,
    }

    const paymethods = paymethodFilter(method)
    if (paymethods) params.DS_MERCHANT_PAYMETHODS = paymethods

    const { merchantParameters, signature } = signMerchantParams(params, merchantKey)

    await this.orderModel.updateOne(
      { _id: order._id },
      {
        paymentStatus: 'PROCESSING',
        paymentMethod: method,
        paymentProviderRef: redsysOrderId,
      },
    )

    return {
      gatewayUrl: getGatewayUrl(env),
      fields: {
        Ds_SignatureVersion: 'HMAC_SHA256_V1',
        Ds_MerchantParameters: merchantParameters,
        Ds_Signature: signature,
      },
      orderId: order._id.toString(),
      redsysOrder: redsysOrderId,
      amount: order.total,
    }
  }

  // Server-to-server notification from Sabadell/Redsys.
  // This is the source of truth for payment status — never trust the
  // browser redirect alone.
  async handleSabadellNotification(body: {
    Ds_SignatureVersion?: string
    Ds_MerchantParameters?: string
    Ds_Signature?: string
  }) {
    const merchantKey = process.env.SABADELL_SECRET_KEY
    if (!merchantKey) throw new BadRequestException('Sabadell no configurado')

    const merchantParameters = body?.Ds_MerchantParameters
    const receivedSignature = body?.Ds_Signature
    if (!merchantParameters || !receivedSignature) {
      throw new BadRequestException('Notificación inválida')
    }

    const result = verifyNotification(merchantParameters, receivedSignature, merchantKey)
    if (!result.valid) {
      this.logger.error(`Sabadell: firma inválida para pedido ${result.orderId}`)
      throw new BadRequestException('Firma inválida')
    }

    const order = await this.orderModel.findOne({ paymentProviderRef: result.orderId })
    if (!order) {
      this.logger.error(`Sabadell: pedido no encontrado para ref ${result.orderId}`)
      throw new NotFoundException('Pedido no encontrado')
    }

    if (result.authorized) {
      if (order.paymentStatus !== 'PAID') {
        order.paymentStatus = 'PAID'
        order.paidAt = new Date()
        if (order.status === 'PENDING') {
          order.status = 'ACCEPTED'
          order.acceptedAt = new Date()
        }
        await order.save()

        this.wsGateway.emitToUser(order.userId.toString(), 'order:status', {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          timestamp: new Date().toISOString(),
        })
        this.wsGateway.emitToAdmin('kitchen:new_order', {
          orderId: order._id.toString(),
        })

        this.notificationsService
          .sendOrderStatusNotification(
            order.userId.toString(),
            order.orderNumber,
            order.status as any,
          )
          .catch((e) => this.logger.error(`Failed to send notification: ${e.message}`))

        this.logger.log(
          `Sabadell: pago confirmado para pedido ${order.orderNumber} (code ${result.responseCode})`,
        )
      }
    } else {
      order.paymentStatus = 'FAILED'
      await order.save()
      this.logger.warn(
        `Sabadell: pago rechazado pedido ${order.orderNumber} code ${result.responseCode}`,
      )
    }

    return { received: true }
  }

  // ─── Legacy Stripe-style webhook (kept for compatibility) ─────────
  async handleWebhook(body: unknown, signature: string) {
    this.logger.log(`Webhook received, signature: ${signature?.slice(0, 10) || 'none'}...`)

    const event = body as { type?: string; data?: { object?: { id?: string; status?: string } } }

    if (event?.type === 'payment_intent.succeeded') {
      const providerRef = event.data?.object?.id
      if (!providerRef) throw new BadRequestException('Invalid webhook payload')

      const order = await this.orderModel.findOne({ paymentProviderRef: providerRef })
      if (!order) throw new NotFoundException('Pedido no encontrado para este webhook')

      if (order.paymentStatus !== 'PAID') {
        order.paymentStatus = 'PAID'
        order.paidAt = new Date()
        if (order.status === 'PENDING') {
          order.status = 'ACCEPTED'
          order.acceptedAt = new Date()
        }
        await order.save()

        this.wsGateway.emitToUser(order.userId.toString(), 'order:status', {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          timestamp: new Date().toISOString(),
        })
        this.wsGateway.emitToAdmin('kitchen:new_order', {
          orderId: order._id.toString(),
        })

        this.notificationsService
          .sendOrderStatusNotification(order.userId.toString(), order.orderNumber, order.status as any)
          .catch((e) => this.logger.error(`Failed to send notification: ${e.message}`))

        this.logger.log(`Payment confirmed for order ${order.orderNumber}`)
      }
    }

    if (event?.type === 'payment_intent.payment_failed') {
      const providerRef = event.data?.object?.id
      const order = await this.orderModel.findOne({ paymentProviderRef: providerRef })
      if (order) {
        order.paymentStatus = 'FAILED'
        await order.save()
        this.logger.log(`Payment failed for order ${order.orderNumber}`)
      }
    }

    return { received: true }
  }
}
