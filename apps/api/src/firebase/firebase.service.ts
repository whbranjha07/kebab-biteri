import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import * as admin from 'firebase-admin'
import { getMessaging, Messaging, MulticastMessage } from 'firebase-admin/messaging'

/**
 * Firebase Admin service — initialized once at startup.
 *
 * Credentials are read from environment variables (never from a committed JSON file):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY  (use \n escapes in .env)
 *
 * If credentials are missing the service starts in "disabled" mode:
 *   - sendMulticast() becomes a no-op that returns empty results.
 *   - The rest of the backend continues to work normally (Socket.IO, REST, DB).
 *   - A warning is logged so the developer knows push notifications are inactive.
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name)
  private app: admin.App | null = null
  private messaging: Messaging | null = null
  private initialized = false

  onModuleInit() {
    this.init()
  }

  private init() {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY

    // All three are required for a valid service-account credential
    if (!projectId || !clientEmail || !privateKeyRaw) {
      this.logger.warn(
        'Firebase Admin not initialized — FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY is missing. ' +
          'Push notifications will be disabled. Set these in .env to enable FCM.',
      )
      return
    }

    try {
      // Support both raw newlines and \n escape sequences in .env
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

  /**
   * Send a push notification to one or more FCM tokens.
   * Returns the list of tokens that were reported as invalid/unregistered
   * so the caller can remove them from the database.
   */
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

    const message: MulticastMessage = {
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
      const response = await this.messaging!.sendEachForMulticast(message)

      const invalidTokens: string[] = []
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code
          // FCM error codes that indicate the token is permanently invalid
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
