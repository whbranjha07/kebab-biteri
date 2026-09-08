import { Injectable, Logger, OnModuleInit } from '@nestjs/common'

let admin: any = null
let getMessaging: any = null
try {
  admin = require('firebase-admin')
  getMessaging = require('firebase-admin/messaging').getMessaging
} catch (e) {
  // firebase-admin is optional
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name)
  private app: any = null
  private messaging: any = null
  private initialized = false

  onModuleInit() {
    this.init()
  }

  private init() {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY

    if (!admin || !getMessaging || !projectId || !clientEmail || !privateKeyRaw) {
      this.logger.warn(
        'Firebase Admin not initialized — FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY is missing or firebase-admin is not installed. Push notifications will be disabled.',
      )
      return
    }

    try {
      const privateKey = privateKeyRaw.replace(/\\n/g, '\n')

      this.app = admin.initializeApp({
        credential: admin.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
      this.messaging = getMessaging(this.app)
      this.initialized = true
      this.logger.log('Firebase Admin initialized successfully ✓')
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Failed to initialize Firebase Admin: ${errorMsg}`)
    }
  }

  get isAvailable(): boolean {
    return this.initialized && this.messaging !== null
  }

  async sendMulticast(
    tokens: string[],
    payload: {
      title: string
      body: string
      data?: Record<string, string>
    },
  ): Promise<{ invalidTokens: string[]; successCount: number; failureCount: number }> {
    if (!this.isAvailable || tokens.length === 0) {
      return { invalidTokens: [], successCount: 0, failureCount: 0 }
    }

    const message: any = {
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      tokens,
      android: {
        notification: { icon: 'icons/icon-192.png', color: '#F4BE2C' },
        priority: 'high',
      },
      apns: {
        payload: {
          aps: { sound: 'default' },
        },
      },
      webpush: {
        notification: {
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192-maskable.png',
          tag: payload.data?.orderNumber ?? 'kebab-biteri',
        },
        fcmOptions: {
          link: payload.data?.orderId ? `/orders/${payload.data.orderId}` : '/',
        },
      },
    }

    try {
      const response = await this.messaging.sendEachForMulticast(message)

      const invalidTokens: string[] = []
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-argument'
          ) {
            invalidTokens.push(tokens[idx])
            this.logger.warn(`FCM token marked invalid: ${tokens[idx].slice(0, 12)}… — ${code}`)
          } else {
            this.logger.error(`FCM send failed for token ${tokens[idx].slice(0, 12)}… — ${code}: ${resp.error.message}`)
          }
        }
      })

      this.logger.log(
        `FCM multicast: ${response.successCount} sent, ${response.failureCount} failed, ${invalidTokens.length} invalid tokens`,
      )

      return {
        invalidTokens,
        successCount: response.successCount,
        failureCount: response.failureCount,
      }
    } catch (err: unknown) {
      const errorMsg2 = err instanceof Error ? err.message : String(err)
      this.logger.error(`FCM multicast error: ${errorMsg2}`)
      return { invalidTokens: [], successCount: 0, failureCount: tokens.length }
    }
  }
}
