import { Module } from '@nestjs/common';
import { MevService } from './mev.service';

@Module({
  providers: [MevService],
  exports: [MevService],
})
export class MevModule {}
