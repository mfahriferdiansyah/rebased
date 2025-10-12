import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from '@app/queue/types';
import { ChainListenerService } from './chain-listener.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.INDEXER,
    }),
  ],
  providers: [ChainListenerService],
  exports: [ChainListenerService],
})
export class ListenersModule {}
