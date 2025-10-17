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
    description: 'On-chain strategy ID (from StrategyRegistry contract)',
    example: 1710000000000,
    required: false,
  })
  @IsOptional()
  strategyId?: bigint | string | number;

  @ApiProperty({
    description: 'Deployment transaction hash (from on-chain deployment)',
    example: '0xa847793343553d5ecd5c9678892e39045986fb02e20dc2ae425f5b93cd344d70',
    required: false,
  })
  @IsString()
  @IsOptional()
  deployTxHash?: string;

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
    description: 'Rebalance interval in seconds (accepts small values for testing)',
    example: 86400,
  })
  @IsInt()
  @Min(1) // Min 1 second (testing mode)
  rebalanceInterval: number;

  @ApiProperty({
    description: 'DeleGator smart contract address for execution',
    example: '0x2E16Fe00258dbf519C59C7C30FA80F22fcFe8421',
    required: false,
  })
  @IsEthereumAddress()
  @IsOptional()
  delegatorAddress?: string;

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
    description: 'DeleGator smart contract address for execution',
    example: '0x2E16Fe00258dbf519C59C7C30FA80F22fcFe8421',
    required: false,
  })
  @IsEthereumAddress()
  @IsOptional()
  delegatorAddress?: string;

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
    description: 'Rebalance interval in seconds (accepts small values for testing)',
    example: 86400,
    required: false,
  })
  @IsInt()
  @Min(1) // Min 1 second (testing mode)
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
  delegatorAddress?: string;

  @ApiProperty({ required: false })
  strategyLogic?: object;

  @ApiProperty()
  version: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isDeployed: boolean;

  @ApiProperty({ required: false })
  deployTxHash?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  lastRebalance?: Date;

  @ApiProperty({ required: false })
  nextRebalance?: Date;
}
