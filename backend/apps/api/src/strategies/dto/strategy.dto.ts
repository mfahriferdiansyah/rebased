import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsInt,
  IsBoolean,
  IsOptional,
  IsEthereumAddress,
  IsObject,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CreateStrategyDto {
  @ApiProperty({
    description: 'Chain ID (10143 for Monad, 84532 for Base)',
    example: 10143,
  })
  @IsInt()
  chainId: number;

  @ApiProperty({
    description: 'Strategy name',
    example: 'My Balanced Portfolio',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Array of token addresses',
    example: ['0x...', '0x...'],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsEthereumAddress({ each: true })
  tokens: string[];

  @ApiProperty({
    description: 'Array of weights (basis points, must sum to 10000)',
    example: [5000, 5000],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(10000, { each: true })
  weights: number[];

  @ApiProperty({
    description: 'Rebalance interval in seconds',
    example: 86400,
  })
  @IsInt()
  @Min(3600) // Min 1 hour
  rebalanceInterval: number;

  @ApiProperty({
    description: 'Complete canvas strategy logic (blocks, connections, metadata) - optional',
    example: {
      id: 'strategy-123',
      name: 'My Strategy',
      description: 'Portfolio automation',
      blocks: [],
      connections: [],
      metadata: { createdAt: 1710000000000, updatedAt: 1710000000000, version: '1.0' }
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  strategyLogic?: object;
}

export class UpdateStrategyDto {
  @ApiProperty({
    description: 'Array of weights (basis points, must sum to 10000)',
    example: [6000, 4000],
    required: false,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(10000, { each: true })
  @IsOptional()
  weights?: number[];

  @ApiProperty({
    description: 'Rebalance interval in seconds',
    example: 86400,
    required: false,
  })
  @IsInt()
  @Min(3600)
  @IsOptional()
  rebalanceInterval?: number;

  @ApiProperty({
    description: 'Whether the strategy is active',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class StrategyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  chainId: number;

  @ApiProperty()
  strategyId: string;

  @ApiProperty()
  userAddress: string;

  @ApiProperty()
  tokens: string[];

  @ApiProperty()
  weights: number[];

  @ApiProperty()
  rebalanceInterval: string;

  @ApiProperty({ required: false })
  strategyLogic?: object;

  @ApiProperty()
  version: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  lastRebalance?: Date;

  @ApiProperty({ required: false })
  nextRebalance?: Date;
}
