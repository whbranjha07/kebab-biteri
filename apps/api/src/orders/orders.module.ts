import { Module } from '@nestjs/common'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { DatabaseModule } from '../database/database.module'
import { WebsocketModule } from '../websockets/websocket.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { MailModule } from '../mail/mail.module'

@Module({
  imports: [DatabaseModule, WebsocketModule, NotificationsModule, MailModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
