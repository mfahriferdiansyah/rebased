import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from '@app/config/configuration';
import { validationSchema } from '@app/config/validation.schema';
import { DatabaseModule } from '@app/database';
import { BlockchainModule } from '@app/blockchain';
import { QueueModule } from '@app/queue';
import { NotificationsModule } from '@app/notifications';
import { EventsModule } from '@app/events';
import { MonitorModule } from './monitor/monitor.module';
import { ExecutorModule } from './executor/executor.module';
import { DexModule } from './dex/dex.module';
import { GasModule } from './gas/gas.module';
import { MevModule } from './mev/mev.module';
import { StrategyModule } from './strategy/strategy.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),

    // Schedule for cron jobs
    ScheduleModule.forRoot(),

    // Global modules
    DatabaseModule,
    BlockchainModule,
    QueueModule,
    NotificationsModule,
    EventsModule,

    // Feature modules
    MonitorModule,
    ExecutorModule,
    DexModule,
    GasModule,
    MevModule,
    StrategyModule,
  ],
})
export class AppModule {}
