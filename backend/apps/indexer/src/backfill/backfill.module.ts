import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from '@app/queue/types';
import { BackfillService } from './backfill.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.INDEXER,
    }),
  ],
  providers: [BackfillService],
  exports: [BackfillService],
})
export class BackfillModule {}
