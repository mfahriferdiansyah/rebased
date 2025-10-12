import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from '@app/queue/types';
import { EventProcessor } from './event.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.INDEXER },
      { name: QUEUE_NAMES.ANALYTICS },
    ),
  ],
  providers: [EventProcessor],
  exports: [EventProcessor],
})
export class ProcessorsModule {}
