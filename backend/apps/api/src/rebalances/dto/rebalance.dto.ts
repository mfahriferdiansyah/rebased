import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';

export enum RebalanceStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REVERTED = 'REVERTED',
}

export class RebalanceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  strategyId: string;

  @ApiProperty()
  txHash: string;

  @ApiProperty()
  chainId: number;

  @ApiProperty()
  userAddress: string;

  @ApiProperty({ description: 'Drift before rebalance in basis points' })
  drift: string;

  @ApiProperty({ description: 'Drift after rebalance in basis points', nullable: true })
  driftAfter: string | null;

  @ApiProperty({ description: 'Gas used for transaction' })
  gasUsed: string;

  @ApiProperty({ description: 'Gas price in wei' })
  gasPrice: string;

  @ApiProperty({ description: 'Total gas cost in wei' })
  gasCost: string;

  @ApiProperty({ description: 'Number of swaps executed' })
  swapsExecuted: number;

  @ApiProperty({ enum: RebalanceStatus })
  status: RebalanceStatus;

  @ApiPropertyOptional({ description: 'Error message if failed', nullable: true })
  errorMessage?: string | null;

  @ApiPropertyOptional({ description: 'Bot address that executed', nullable: true })
  executedBy?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  executedAt: Date;

  @ApiPropertyOptional({ description: 'Strategy name', nullable: true })
  strategyName?: string;
}

export class GetRebalancesQueryDto {
  @ApiPropertyOptional({ description: 'Filter by strategy ID' })
  @IsOptional()
  strategyId?: string;

  @ApiPropertyOptional({ description: 'Filter by chain ID' })
  @IsOptional()
  @IsInt()
  chainId?: number;

  @ApiPropertyOptional({ description: 'Filter by status', enum: RebalanceStatus })
  @IsOptional()
  @IsEnum(RebalanceStatus)
  status?: RebalanceStatus;

  @ApiPropertyOptional({ description: 'Limit results', minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Skip results for pagination', minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;
}
