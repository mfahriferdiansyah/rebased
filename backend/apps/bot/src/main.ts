import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('BotWorker');

  const app = await NestFactory.create(AppModule);

  await app.init();

  logger.log('🤖 Bot Worker started successfully');
  logger.log('📊 Monitor service: Active');
  logger.log('⚙️  Executor queue: Listening');
  logger.log('🔄 DEX aggregators: Ready');
  logger.log('⛽ Gas oracle: Monitoring');
  logger.log('🛡️  MEV protection: Enabled');
}

bootstrap();
