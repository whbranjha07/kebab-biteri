import { Injectable, Logger } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'

/**
 * Realtime event publisher — pushes events to Firestore, which the web app
 * subscribes to via long-lived listeners. The historical name "WebsocketGateway"
 * is kept so existing callers (orders, payments, delivery services) don't churn.
 *
 * Server writes:
 *   user_events/{userId}/events/{autoId}  — { type, data, createdAt }
 *   admin_events/{autoId}                  — { type, data, createdAt }
 *
 * Web clients subscribe with onSnapshot to the collection above their own
 * anchor timestamp, so they only see events emitted after they connected.
 */
@Injectable()
export class WebsocketGateway {
  private readonly logger = new Logger(WebsocketGateway.name)

  constructor(private readonly firebase: FirebaseService) {}

  // Firestore rejects custom-prototype objects (Mongo ObjectId, Date subclasses, etc).
  // JSON round-trip strips them to plain scalars/plain-object graphs.
  private toPlain(data: unknown): unknown {
    if (data == null) return null
    try {
      return JSON.parse(JSON.stringify(data))
    } catch {
      return null
    }
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    const db = this.firebase.firestore
    if (!db) {
      this.logger.debug(`Firebase not configured; dropping user event ${event} for ${userId}`)
      return
    }
    if (!userId) {
      this.logger.warn(`emitToUser called with empty userId (event=${event})`)
      return
    }
    try {
      db.collection('user_events')
        .doc(userId)
        .collection('events')
        .add({
          type: event,
          data: this.toPlain(data),
          createdAt: this.firebase.serverTimestamp,
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          this.logger.error(`Failed to publish user event ${event} for ${userId}: ${msg}`)
        })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Failed to publish user event ${event} for ${userId} (sync throw): ${msg}`)
    }
  }

  emitToAdmin(event: string, data: unknown): void {
    const db = this.firebase.firestore
    if (!db) {
      this.logger.debug(`Firebase not configured; dropping admin event ${event}`)
      return
    }
    try {
      db.collection('admin_events')
        .add({
          type: event,
          data: this.toPlain(data),
          createdAt: this.firebase.serverTimestamp,
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          this.logger.error(`Failed to publish admin event ${event}: ${msg}`)
        })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Failed to publish admin event ${event} (sync throw): ${msg}`)
    }
  }
}
