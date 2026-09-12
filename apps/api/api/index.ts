import 'reflect-metadata'
import type { IncomingMessage, ServerResponse } from 'http'
import * as dns from 'dns'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from '../src/app.module'

// Explicit imports to guarantee Vercel Node File Trace (@vercel/nft) bundles all NestJS controllers and services
import '../src/auth/auth.controller'
import '../src/auth/auth.service'
import '../src/auth/profile.controller'
import '../src/auth/jwt.strategy'
import '../src/database/database.module'
import '../src/mail/mail.service'
import '../src/firebase/firebase.service'
import '../src/menu/menu.controller'
import '../src/menu/menu.service'
import '../src/orders/orders.controller'
import '../src/orders/orders.service'
import '../src/payments/payments.controller'
import '../src/payments/payments.service'
import '../src/coupons/coupons.controller'
import '../src/coupons/coupons.service'
import '../src/addresses/addresses.controller'
import '../src/addresses/addresses.service'
import '../src/admin/admin.controller'
import '../src/admin/admin.service'
import '../src/delivery/delivery.controller'
import '../src/delivery/delivery.service'
import '../src/notifications/notifications.controller'
import '../src/notifications/notifications.service'
import '../src/websockets/websocket.gateway'
import '../src/schemas'

// Explicit subpath imports so @vercel/nft bundles firebase-admin modular
// entrypoints — dynamic requires inside firebase.service.ts's try/catch
// are not always traced.
import 'firebase-admin'
import 'firebase-admin/auth'
import 'firebase-admin/firestore'
import 'firebase-admin/messaging'

function setCorsHeaders(req: IncomingMessage, res: ServerResponse) {
  const origin = (req.headers.origin as string) || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
}

let cachedServer: any = null

async function getApp() {
  if (cachedServer) return cachedServer

  try {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1'])
    } catch {}

    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] })
    app.setGlobalPrefix('api')
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    )

    await app.init()
    cachedServer = app.getHttpAdapter().getInstance()
    return cachedServer
  } catch (err) {
    cachedServer = null
    throw err
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  // Restore original request path if Vercel rewrote req.url to destination (/api/index.ts)
  const matchedPath = (req.headers['x-matched-path'] as string) || (req.headers['x-now-route-matches'] as string)
  if (matchedPath && !matchedPath.includes('index.ts')) {
    req.url = matchedPath
  }

  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`
  }

  try {
    const instance = await getApp()
    return instance(req, res)
  } catch (err: any) {
    setCorsHeaders(req, res)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    return res.end(
      JSON.stringify({
        error: 'SERVERLESS_BOOTSTRAP_ERROR',
        message: err?.message || String(err),
        name: err?.name || 'Error',
        stack: err?.stack || null,
      }),
    )
  }
}

export const config = {
  maxDuration: 30,
}
