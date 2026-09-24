import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { DatabaseModule } from '../database/database.module'
import { FirebaseModule } from '../firebase/firebase.module'

@Module({
  imports: [DatabaseModule, FirebaseModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
