import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from '@app/queue/types';
import { MonitorService } from './monitor.service';
import { StrategyModule } from '../strategy/strategy.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.REBALANCE,
    }),
    StrategyModule,
  ],
  providers: [MonitorService],
  exports: [MonitorService],
})
export class MonitorModule {}
