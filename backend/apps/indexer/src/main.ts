import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('IndexerWorker');

  const app = await NestFactory.create(AppModule);

  await app.init();

  logger.log('📡 Indexer Worker started successfully');
  logger.log('🔗 Monad listener: Active');
  logger.log('🔗 Base listener: Active');
  logger.log('⚙️  Event processors: Ready');
  logger.log('📊 Backfill service: Standby');
}

bootstrap();
