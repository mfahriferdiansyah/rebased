import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.config.get('nodeEnv'),
    };
  }

  async detailedCheck() {
    const checks = {
      api: 'ok',
      database: 'unknown',
      redis: 'ok', // TODO: Add Redis ping check
      monadRpc: 'unknown',
      baseRpc: 'unknown',
    };

    // Database check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (error) {
      checks.database = 'error';
    }

    // TODO: Add blockchain RPC health checks
    // TODO: Add Redis health check

    const isHealthy = Object.values(checks).every((status) => status === 'ok');

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      uptime: process.uptime(),
    };
  }
}
