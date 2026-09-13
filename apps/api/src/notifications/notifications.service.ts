import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Notification, User } from '../schemas'
import { FirebaseService } from '../firebase/firebase.service'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    @InjectModel('Notification') private notifModel: Model<Notification>,
    @InjectModel('User') private userModel: Model<User>,
    private firebaseService: FirebaseService,
  ) {}

  /**
   * Send a push notification to all of a user's registered devices.
   * Also persists a notification record in MongoDB for in-app history.
   *
   * Invalid / unregistered FCM tokens are automatically cleaned up.
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    type: string = 'TRANSACTIONAL',
    data?: Record<string, string>,
  ) {
    if (type === 'MARKETING') {
      const user = await this.userModel.findById(userId).lean()
      if (!user?.marketingConsent) return
    }

    // Persist notification in DB for in-app notification history
    const notification = await this.notifModel.create({
      userId: new Types.ObjectId(userId),
      type,
      title,
      body,
      data,
    })

    // Gather all FCM tokens for this user (multi-device)
    const user = await this.userModel.findById(userId).lean()
    if (!user) return notification

    const tokens: string[] = []
    if (user.fcmTokens && user.fcmTokens.length > 0) {
      tokens.push(...user.fcmTokens.map((t) => t.token))
    }
    // Fallback to legacy single-token field
    if (user.fcmToken && !tokens.includes(user.fcmToken)) {
      tokens.push(user.fcmToken)
    }

    if (tokens.length === 0) return notification

    // Send via Firebase Cloud Messaging
    const result = await this.firebaseService.sendMulticast(tokens, { title, body, data })

    // Clean up invalid tokens from the user document
    if (result.invalidTokens.length > 0) {
      await this.removeInvalidTokens(userId, result.invalidTokens)
    }

    if (result.successCount > 0) {
      this.logger.log(`Push notification sent to user ${userId}: ${title} (${result.successCount}/${tokens.length} devices)`)
    }

    return notification
  }

  /**
   * Push a "new order" notification to every ADMIN/MANAGER/KITCHEN user's
   * registered devices. Called at order-creation time so staff get an
   * OS-level push even if the admin PWA isn't focused.
   */
  async sendNewOrderNotificationToAdmins(orderNumber: string, orderId: string, total: number, orderType: string) {
    const admins = await this.userModel
      .find({
        role: { $in: ['ADMIN', 'MANAGER', 'KITCHEN'] },
        isActive: { $ne: false },
      })
      .select('_id fcmTokens fcmToken')
      .lean()

    if (admins.length === 0) return

    const title = '🔔 Nuevo pedido'
    const body = `Pedido #${orderNumber} · €${total.toFixed(2)} · ${orderType === 'DELIVERY' ? 'Entrega' : 'Recogida'}`
    const data = { type: 'NEW_ORDER', orderId, orderNumber, total: total.toFixed(2), orderType }

    const results = await Promise.allSettled(
      admins.map((admin: any) => {
        const uid = admin._id?.toString?.() ?? String(admin._id)
        return this.sendPushNotification(uid, title, body, 'TRANSACTIONAL', data)
      }),
    )

    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      this.logger.warn(`Admin new-order push: ${failed}/${admins.length} recipient failures for order #${orderNumber}`)
    } else {
      this.logger.log(`Admin new-order push: notified ${admins.length} admin(s) for order #${orderNumber}`)
    }
  }

  async sendOrderStatusNotification(userId: string, orderNumber: string, status: string, orderId?: string) {
    const messages: Record<string, { title: string; body: string }> = {
      PENDING: { title: '🌯 Kebab Biteri', body: `Tu pedido #${orderNumber} ha sido recibido.` },
      ACCEPTED: { title: '✅ Kebab Biteri', body: `Tu pedido #${orderNumber} ha sido confirmado.` },
      PREPARING: { title: '🔥 Kebab Biteri', body: `Tu pedido #${orderNumber} se está preparando.` },
      READY: { title: '📦 Kebab Biteri', body: `Tu pedido #${orderNumber} está listo.` },
      OUT_FOR_DELIVERY: { title: '🛵 Kebab Biteri', body: `Tu pedido #${orderNumber} está en reparto.` },
      DELIVERED: { title: '🎉 Kebab Biteri', body: `Tu pedido #${orderNumber} ha sido entregado. ¡Gracias!` },
      CANCELLED: { title: '❌ Kebab Biteri', body: `Tu pedido #${orderNumber} ha sido cancelado.` },
    }

    const msg = messages[status]
    if (!msg) return
    return this.sendPushNotification(userId, msg.title, msg.body, 'TRANSACTIONAL', {
      type: 'ORDER_STATUS',
      orderId: orderId || '',
      orderNumber,
      status,
    })
  }

  // ─── FCM Token Management ───────────────────────────

  /**
   * Register (or update) an FCM token for a user.
   * Prevents duplicates — if the token already exists it is not re-added.
   */
  async registerFcmToken(userId: string, token: string, deviceInfo?: string) {
    if (!token) return

    // Add to multi-device array (prevent duplicates)
    await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId), 'fcmTokens.token': { $ne: token } },
      { $addToSet: { fcmTokens: { token, deviceInfo: deviceInfo ?? '', registeredAt: new Date() } } },
    )

    // Also update legacy field for backward compatibility
    await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $set: { fcmToken: token } },
    )
  }

  /**
   * Remove an FCM token for a user (e.g. when they disable notifications or logout).
   */
  async unregisterFcmToken(userId: string, token: string) {
    if (!token) return

    await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $pull: { fcmTokens: { token } } },
    )

    // Clear legacy field if it matches
    await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId), fcmToken: token },
      { $unset: { fcmToken: '' } },
    )
  }

  /**
   * Remove all FCM tokens for a user (e.g. on logout from all devices).
   */
  async clearAllFcmTokens(userId: string) {
    await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $set: { fcmTokens: [] }, $unset: { fcmToken: '' } },
    )
  }

  /**
   * Remove tokens that Firebase reported as invalid/unregistered.
   * One invalid token does NOT block the rest.
   */
  private async removeInvalidTokens(userId: string, invalidTokens: string[]) {
    if (invalidTokens.length === 0) return

    await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $pull: { fcmTokens: { token: { $in: invalidTokens } } } },
    )

    // Clear legacy field if it's among the invalid ones
    if (invalidTokens.length > 0) {
      await this.userModel.updateOne(
        { _id: new Types.ObjectId(userId), fcmToken: { $in: invalidTokens } },
        { $unset: { fcmToken: '' } },
      )
    }

    this.logger.log(`Cleaned up ${invalidTokens.length} invalid FCM token(s) for user ${userId}`)
  }

  // ─── In-App Notification History ────────────────────

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const notifications = await this.notifModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
    const total = await this.notifModel.countDocuments({ userId: new Types.ObjectId(userId) })
    return { data: notifications, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.notifModel.updateOne(
      { _id: notificationId, userId: new Types.ObjectId(userId) },
      { readAt: new Date() },
    )
  }

  async markAllAsRead(userId: string) {
    return this.notifModel.updateMany(
      { userId: new Types.ObjectId(userId), readAt: null },
      { readAt: new Date() },
    )
  }

  async getUnreadCount(userId: string) {
    return this.notifModel.countDocuments({ userId: new Types.ObjectId(userId), readAt: null })
  }
}
