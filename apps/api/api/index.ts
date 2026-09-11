import 'reflect-metadata'
import type { IncomingMessage, ServerResponse } from 'http'
import * as dns from 'dns'

function setCorsHeaders(req: IncomingMessage, res: ServerResponse) {
  const origin = (req.headers.origin as string) || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
}

let cachedApp: any = null

async function getApp() {
  if (cachedApp) return cachedApp

  try {
    dns.setServers(['8.8.8.8', '1.1.1.1'])
  } catch {}

  const { NestFactory } = require('@nestjs/core')
  const { ValidationPipe } = require('@nestjs/common')
  
  let AppModule: any
  try {
    AppModule = require('../dist/app.module').AppModule
  } catch {
    AppModule = require('../src/app.module').AppModule
  }

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
  cachedApp = app.getHttpAdapter().getInstance()
  return cachedApp
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
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
    res.end(
      JSON.stringify({
        error: 'SERVERLESS_BOOTSTRAP_ERROR',
        message: err?.message || String(err),
        stack: err?.stack || null,
      }),
    )
  }
}

export const config = {
  maxDuration: 30,
}
