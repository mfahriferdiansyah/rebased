import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from '@app/queue/types';
import { ExecutorProcessor } from './executor.processor';
import { DexModule } from '../dex/dex.module';
import { GasModule } from '../gas/gas.module';
import { MevModule } from '../mev/mev.module';
import { StrategyModule } from '../strategy/strategy.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.REBALANCE,
    }),
    DexModule,
    GasModule,
    MevModule,
    StrategyModule,
  ],
  providers: [ExecutorProcessor],
  exports: [ExecutorProcessor],
})
export class ExecutorModule {}
