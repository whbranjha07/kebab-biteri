import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import helmet from 'helmet'
import * as dns from 'dns'
import { AppModule } from './app.module'

// Ensure public DNS resolvers are available for MongoDB Atlas SRV record lookups
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()])
} catch {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.NEXT_PUBLIC_FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[]

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true)
      } else {
        callback(null, true)
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  })

  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  console.log(`🚀 Kebab Biteri API running on http://localhost:${port}`)
}
bootstrap()
