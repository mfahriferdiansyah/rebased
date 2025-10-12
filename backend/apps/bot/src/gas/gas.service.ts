import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChainService } from '@app/blockchain';
import { PrismaService } from '@app/database';
import { ConfigService } from '@nestjs/config';
import { SupportedChain } from '@app/blockchain/chains';

@Injectable()
export class GasService {
  private readonly logger = new Logger(GasService.name);
  private readonly gasCache = new Map<SupportedChain, bigint>();

  constructor(
    private readonly chain: ChainService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Get optimal gas price for a chain
   */
  async getOptimalGasPrice(chain: SupportedChain): Promise<bigint> {
    // Return cached value if available and fresh
    const cached = this.gasCache.get(chain);
    if (cached) return cached;

    // Otherwise fetch current gas price
    return this.fetchGasPrice(chain);
  }

  /**
   * Fetch current gas price from RPC
   */
  private async fetchGasPrice(chain: SupportedChain): Promise<bigint> {
    try {
      const client = this.chain.getPublicClient(chain);
      const gasPrice = await client.getGasPrice();

      // Apply multiplier for faster inclusion (e.g., 1.1x)
      const multiplier = this.config.get<number>('bot.gasPriceMultiplier', 1.1);
      const adjustedGasPrice = (gasPrice * BigInt(Math.floor(multiplier * 100))) / 100n;

      // Update cache
      this.gasCache.set(chain, adjustedGasPrice);

      this.logger.debug(
        `Gas price for ${chain}: ${adjustedGasPrice.toString()} (${multiplier}x)`,
      );

      return adjustedGasPrice;
    } catch (error) {
      this.logger.error(
        `Error fetching gas price for ${chain}: ${error.message}`,
      );

      // Return fallback gas price
      const fallback = this.config.get<bigint>(
        `blockchain.${chain}.defaultGasPrice`,
        10000000000n,
      );
      return fallback;
    }
  }

  /**
   * Update gas prices every 15 seconds
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateGasPrices() {
    try {
      const monadGas = await this.fetchGasPrice('monad');
      const baseGas = await this.fetchGasPrice('base');

      // Save to database for historical tracking
      await this.prisma.gasPrice.createMany({
        data: [
          {
            chainId: 10143,
            slow: monadGas,
            standard: monadGas,
            fast: monadGas,
            instant: monadGas,
            timestamp: new Date(),
          },
          {
            chainId: 84532,
            slow: baseGas,
            standard: baseGas,
            fast: baseGas,
            instant: baseGas,
            timestamp: new Date(),
          },
        ],
      });
    } catch (error) {
      this.logger.error(`Error updating gas prices: ${error.message}`);
    }
  }

  /**
   * Get gas price statistics for a chain
   */
  async getGasStats(chain: SupportedChain, hoursBack: number = 24) {
    const chainId = chain === 'monad' ? 10143 : 84532;
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const prices = await this.prisma.gasPrice.findMany({
      where: {
        chainId,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (prices.length === 0) {
      return {
        min: 0n,
        max: 0n,
        avg: 0n,
        current: await this.getOptimalGasPrice(chain),
      };
    }

    const gasPrices = prices.map((p) => p.standard); // Use standard gas price
    const min = gasPrices.reduce((a, b) => (a < b ? a : b));
    const max = gasPrices.reduce((a, b) => (a > b ? a : b));
    const sum = gasPrices.reduce((a, b) => a + b, 0n);
    const avg = sum / BigInt(gasPrices.length);

    return {
      min,
      max,
      avg,
      current: await this.getOptimalGasPrice(chain),
      samples: prices.length,
    };
  }

  /**
   * Check if current gas price is favorable for execution
   */
  async isGasFavorable(chain: SupportedChain): Promise<boolean> {
    const current = await this.getOptimalGasPrice(chain);
    const stats = await this.getGasStats(chain, 1); // Last hour

    // Consider favorable if below 75th percentile
    const threshold = stats.avg + (stats.max - stats.avg) / 4n;

    const isFavorable = current <= threshold;

    this.logger.debug(
      `Gas check for ${chain}: ${current} <= ${threshold} = ${isFavorable}`,
    );

    return isFavorable;
  }

  /**
   * Estimate total transaction cost
   */
  async estimateTxCost(
    chain: SupportedChain,
    gasLimit: bigint,
  ): Promise<{ gasCost: bigint; gasCostUsd: number }> {
    const gasPrice = await this.getOptimalGasPrice(chain);
    const gasCost = gasPrice * gasLimit;

    // TODO: Get native token price in USD from oracle
    const nativeTokenPriceUsd = 2000; // Mock ETH price

    const gasCostUsd =
      (Number(gasCost) / 1e18) * nativeTokenPriceUsd;

    return { gasCost, gasCostUsd };
  }
}
