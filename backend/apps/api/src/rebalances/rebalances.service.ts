import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import {
  GetRebalancesQueryDto,
  RebalanceResponseDto,
  RebalanceStatus,
} from './dto/rebalance.dto';

@Injectable()
export class RebalancesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all rebalances for a user with optional filters
   */
  async findAll(
    userAddress: string,
    query: GetRebalancesQueryDto,
  ): Promise<{ data: RebalanceResponseDto[]; total: number }> {
    const { strategyId, chainId, status, limit = 50, skip = 0 } = query;

    // Build where clause
    const where: any = {
      userAddress: userAddress.toLowerCase(),
    };

    if (strategyId) {
      where.strategyId = strategyId;
    }

    if (chainId) {
      where.chainId = chainId;
    }

    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await this.prisma.rebalance.count({ where });

    // Get rebalances with strategy relation
    const rebalances = await this.prisma.rebalance.findMany({
      where,
      include: {
        strategy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { executedAt: 'desc' },
      take: Math.min(limit, 100),
      skip,
    });

    return {
      data: rebalances.map((r) => this.formatRebalance(r)),
      total,
    };
  }

  /**
   * Get a specific rebalance by ID
   */
  async findOne(id: string, userAddress: string): Promise<RebalanceResponseDto> {
    const rebalance = await this.prisma.rebalance.findUnique({
      where: { id },
      include: {
        strategy: {
          select: {
            name: true,
            userAddress: true,
          },
        },
      },
    });

    if (!rebalance) {
      throw new NotFoundException('Rebalance not found');
    }

    // Verify ownership
    if (rebalance.strategy.userAddress !== userAddress.toLowerCase()) {
      throw new ForbiddenException('You do not own this rebalance');
    }

    return this.formatRebalance(rebalance);
  }

  /**
   * Get rebalance statistics for a user
   */
  async getStats(userAddress: string, chainId?: number) {
    const where: any = {
      userAddress: userAddress.toLowerCase(),
    };

    if (chainId) {
      where.chainId = chainId;
    }

    // Total rebalances
    const total = await this.prisma.rebalance.count({ where });

    // Successful rebalances
    const successful = await this.prisma.rebalance.count({
      where: { ...where, status: RebalanceStatus.SUCCESS },
    });

    // Failed rebalances
    const failed = await this.prisma.rebalance.count({
      where: { ...where, status: RebalanceStatus.FAILED },
    });

    // Pending rebalances
    const pending = await this.prisma.rebalance.count({
      where: { ...where, status: RebalanceStatus.PENDING },
    });

    // Total gas cost
    const rebalances = await this.prisma.rebalance.findMany({
      where: { ...where, status: RebalanceStatus.SUCCESS },
      select: { gasCost: true },
    });

    const totalGasCost = rebalances.reduce(
      (sum, r) => sum + BigInt(r.gasCost),
      BigInt(0),
    );

    // Average drift reduction
    const driftReductions = await this.prisma.rebalance.findMany({
      where: {
        ...where,
        status: RebalanceStatus.SUCCESS,
        driftAfter: { not: null },
      },
      select: { drift: true, driftAfter: true },
    });

    const avgDriftReduction =
      driftReductions.length > 0
        ? driftReductions.reduce((sum, r) => {
            const reduction = Number(r.drift) - Number(r.driftAfter || 0);
            return sum + reduction;
          }, 0) / driftReductions.length
        : 0;

    return {
      total,
      successful,
      failed,
      pending,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      totalGasCost: totalGasCost.toString(),
      avgDriftReduction: Math.round(avgDriftReduction),
    };
  }

  /**
   * Format rebalance for API response
   */
  private formatRebalance(rebalance: any): RebalanceResponseDto {
    return {
      id: rebalance.id,
      strategyId: rebalance.strategyId,
      txHash: rebalance.txHash,
      chainId: rebalance.chainId,
      userAddress: rebalance.userAddress,
      drift: rebalance.drift.toString(),
      driftAfter: rebalance.driftAfter?.toString() || null,
      gasUsed: rebalance.gasUsed.toString(),
      gasPrice: rebalance.gasPrice.toString(),
      gasCost: rebalance.gasCost.toString(),
      swapsExecuted: rebalance.swapsExecuted,
      status: rebalance.status,
      errorMessage: rebalance.errorMessage,
      executedBy: rebalance.executedBy,
      createdAt: rebalance.createdAt,
      executedAt: rebalance.executedAt,
      strategyName: rebalance.strategy?.name || undefined,
    };
  }
}
