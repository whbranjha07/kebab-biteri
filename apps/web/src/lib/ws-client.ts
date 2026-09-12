'use client'

/**
 * Realtime event client — Firestore-backed.
 *
 * The file is still called `ws-client.ts` (and exports `getSocket` /
 * `getAdminSocket`) so existing callers don't churn, but there is no
 * WebSocket underneath: server publishes events to Firestore, browser
 * subscribes via long-lived onSnapshot. Works on Vercel serverless
 * because the browser holds the long-lived connection to Firestore, not
 * to your API.
 *
 * Auth flow:
 *   1. On first subscribe, POST /auth/firebase-token with the app JWT
 *   2. signInWithCustomToken → Firebase Auth identifies the browser as
 *      the same userId your API knows, so security rules apply
 *   3. onSnapshot on `user_events/{uid}/events` (or `admin_events`)
 *      filtered to `createdAt > <connect time>` so we only see new events
 */

import { api } from '@/lib/api-client'
import { getFirestoreClient, getFirebaseAuth, isFirebaseCoreConfigured } from '@/lib/firebase/config'

type EventHandler = (data: any) => void

interface RealtimeChannel {
  on: (event: string, handler: EventHandler) => void
  off: (event: string, handler?: EventHandler) => void
  disconnect: () => void
}

// ─── No-op channel used when Firebase is unavailable ─────────────

function noopChannel(): RealtimeChannel {
  return {
    on: () => {},
    off: () => {},
    disconnect: () => {},
  }
}

// ─── Live channel backed by a single Firestore onSnapshot ────────

class FirestoreChannel implements RealtimeChannel {
  private handlers = new Map<string, Set<EventHandler>>()
  private unsubscribe: (() => void) | null = null
  private disposed = false

  constructor(private readonly kind: 'user' | 'admin') {
    void this.connect()
  }

  private async connect() {
    if (this.disposed) return
    if (!isFirebaseCoreConfigured()) {
      console.log(`[Realtime:${this.kind}] Firebase not configured — subscription skipped.`)
      return
    }
    try {
      const auth = await getFirebaseAuth()
      const db = await getFirestoreClient()
      if (!auth || !db) return

      const { onAuthStateChanged, signInWithCustomToken } = await import('firebase/auth' as any)
      const {
        collection,
        collectionGroup,
        doc,
        query,
        where,
        orderBy,
        onSnapshot,
        Timestamp,
      } = await import('firebase/firestore' as any)

      // If the browser is not yet signed into Firebase (or is signed in as
      // someone else), mint a custom token from our API and sign in.
      const currentUid: string | null = auth.currentUser?.uid ?? null
      let uid: string | null = currentUid

      if (!uid) {
        try {
          const res = await api.post<{ token: string; admin: boolean }>('/auth/firebase-token', {})
          if (!res?.token) throw new Error('empty token from /auth/firebase-token')
          const cred = await signInWithCustomToken(auth, res.token)
          uid = cred?.user?.uid ?? null
        } catch (err: any) {
          console.log(`[Realtime:${this.kind}] Sign-in failed:`, err?.message || err)
          return
        }
      }

      if (!uid) return
      if (this.disposed) return

      const anchor = Timestamp.now()

      let colRef: any
      if (this.kind === 'user') {
        colRef = collection(doc(collection(db, 'user_events'), uid), 'events')
      } else {
        colRef = collection(db, 'admin_events')
      }

      const q = query(colRef, where('createdAt', '>', anchor), orderBy('createdAt', 'asc'))

      this.unsubscribe = onSnapshot(
        q,
        (snap: any) => {
          snap.docChanges().forEach((change: any) => {
            if (change.type !== 'added') return
            const raw = change.doc.data()
            const type: string | undefined = raw?.type
            const data = raw?.data
            if (!type) return
            const set = this.handlers.get(type)
            if (!set || set.size === 0) return
            for (const handler of set) {
              try {
                handler(data)
              } catch (err) {
                console.error(`[Realtime:${this.kind}] handler for '${type}' threw`, err)
              }
            }
          })
        },
        (err: any) => {
          console.log(`[Realtime:${this.kind}] Subscription error:`, err?.message || err)
        },
      )
      // silence unused import warning; keep for potential future use
      void collectionGroup
    } catch (err: any) {
      console.log(`[Realtime:${this.kind}] Connect failed:`, err?.message || err)
    }
  }

  on(event: string, handler: EventHandler) {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler)
  }

  off(event: string, handler?: EventHandler) {
    if (!handler) {
      this.handlers.delete(event)
      return
    }
    const set = this.handlers.get(event)
    if (!set) return
    set.delete(handler)
    if (set.size === 0) this.handlers.delete(event)
  }

  disconnect() {
    this.disposed = true
    this.handlers.clear()
    if (this.unsubscribe) {
      try { this.unsubscribe() } catch {}
      this.unsubscribe = null
    }
  }
}

// ─── Cache one channel per kind for the browser session ──────────

const channels = new Map<'user' | 'admin', RealtimeChannel>()

function getChannel(kind: 'user' | 'admin'): RealtimeChannel {
  if (typeof window === 'undefined') return noopChannel()
  const existing = channels.get(kind)
  if (existing) return existing
  const ch: RealtimeChannel = isFirebaseCoreConfigured() ? new FirestoreChannel(kind) : noopChannel()
  channels.set(kind, ch)
  return ch
}

// ─── Public API — matches the old socket.io-client surface ───────

export function getSocket(): RealtimeChannel {
  return getChannel('user')
}

export function getAdminSocket(): RealtimeChannel {
  return getChannel('admin')
}

export function disconnectSocket() {
  for (const [key, ch] of channels) {
    ch.disconnect()
    channels.delete(key)
  }
  // also sign out of Firebase Auth so a subsequent login can re-mint
  void (async () => {
    try {
      const auth = await getFirebaseAuth()
      if (auth?.currentUser) {
        const { signOut } = await import('firebase/auth' as any)
        await signOut(auth)
      }
    } catch {}
  })()
}
