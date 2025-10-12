import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '@app/config/configuration';
import { validationSchema } from '@app/config/validation.schema';
import { DatabaseModule } from '@app/database';
import { BlockchainModule } from '@app/blockchain';
import { QueueModule } from '@app/queue';
import { NotificationsModule } from '@app/notifications';
import { EventsModule } from '@app/events';
import { ListenersModule } from './listeners/listeners.module';
import { ProcessorsModule } from './processors/processors.module';
import { BackfillModule } from './backfill/backfill.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),

    // Global modules
    DatabaseModule,
    BlockchainModule,
    QueueModule,
    NotificationsModule,
    EventsModule,

    // Feature modules
    ListenersModule,
    ProcessorsModule,
    BackfillModule,
  ],
})
export class AppModule {}
