import { Module } from '@nestjs/common';
import { PythPushService } from './pyth-push.service';

@Module({
  providers: [PythPushService],
  exports: [PythPushService],
})
export class PythModule {}
