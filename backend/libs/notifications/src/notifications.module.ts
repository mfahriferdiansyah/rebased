import { Module, Global } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';

@Global()
@Module({
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
