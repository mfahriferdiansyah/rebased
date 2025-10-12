import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('HTTP');

  const config = app.get(ConfigService);
  const port = config.get<number>('port', 3000);

  // CORS - MUST be enabled BEFORE other middleware
  const corsOrigin = config.get<string | string[]>('cors.origin');
  const allowedOrigins = Array.isArray(corsOrigin) ? corsOrigin.map(o => o.trim()) : ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'];

  logger.log(`CORS enabled for origins: ${allowedOrigins.join(', ')}`);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        logger.log(`✓ CORS allowed for origin: ${origin}`);
        callback(null, true);
      } else {
        logger.warn(`✗ CORS blocked for origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400, // 24 hours
  });

  // Request/Response Logging Middleware
  app.use((req, res, next) => {
    const { method, originalUrl } = req;
    const origin = req.headers.origin;
    const startTime = Date.now();

    logger.log(`→ ${method} ${originalUrl} (origin: ${origin || 'none'})`);

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const logMessage = `← ${method} ${originalUrl} ${statusCode} - ${duration}ms`;

      if (statusCode >= 500) {
        logger.error(logMessage);
      } else if (statusCode >= 400) {
        logger.warn(logMessage);
      } else {
        logger.log(logMessage);
      }
    });

    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Rebased API')
    .setDescription('Non-custodial portfolio automation platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Wallet authentication (SIWE)')
    .addTag('tokens', 'Token information and search')
    .addTag('strategies', 'Strategy management')
    .addTag('delegations', 'ERC-7710 delegations')
    .addTag('rebalances', 'Rebalance history')
    .addTag('analytics', 'Performance analytics')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
  console.log(`🚀 API Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api`);
}

bootstrap();
