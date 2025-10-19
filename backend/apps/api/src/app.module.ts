import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import configuration from '@app/config/configuration';
import { validationSchema } from '@app/config/validation.schema';
import { DatabaseModule } from '@app/database';
import { BlockchainModule } from '@app/blockchain';
import { QueueModule } from '@app/queue';
import { NotificationsModule } from '@app/notifications';
import { EventsModule } from '@app/events';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { StrategiesModule } from './strategies/strategies.module';
import { DelegationsModule } from './delegations/delegations.module';
import { TokensModule } from './tokens/tokens.module';
import { RebalancesModule } from './rebalances/rebalances.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),

    // JWT (global)
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        },
      }),
    }),

    // Global modules
    DatabaseModule,
    BlockchainModule,
    QueueModule,
    NotificationsModule,
    EventsModule,

    // Feature modules
    HealthModule,
    AuthModule,
    StrategiesModule,
    DelegationsModule,
    TokensModule,
    RebalancesModule,
    AiModule,
  ],
})
export class AppModule {}
