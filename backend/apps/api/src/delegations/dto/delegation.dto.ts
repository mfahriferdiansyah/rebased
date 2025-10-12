import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsEthereumAddress,
  IsObject,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateDelegationDto {
  @ApiProperty({
    description: 'Chain ID where delegation is valid',
    example: 10143,
  })
  @IsInt()
  chainId: number;

  @ApiProperty({
    description: 'Strategy ID to delegate (optional - can be linked later)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  strategyId?: string;

  @ApiProperty({
    description: 'Bot delegate address (executor)',
    example: '0x...',
  })
  @IsEthereumAddress()
  delegateAddress: string;

  @ApiProperty({
    description: 'ERC-7710 delegation data',
    example: {
      delegate: '0x...',
      authority: '0x...',
      caveats: [],
      salt: 0,
      signature: '0x...',
    },
  })
  @IsObject()
  delegationData: any;

  @ApiProperty({
    description: 'EIP-712 signature of the delegation',
    example: '0x...',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;
}

export class RevokeDelegationDto {
  @ApiProperty({
    description: 'Delegation ID to revoke',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  delegationId: string;
}

export class DelegationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  chainId: number;

  @ApiProperty({ required: false })
  strategyId?: string;

  @ApiProperty()
  userAddress: string;

  @ApiProperty()
  delegateAddress: string;

  @ApiProperty()
  delegationData: any;

  @ApiProperty()
  signature: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DelegationStatsDto {
  @ApiProperty()
  totalDelegations: number;

  @ApiProperty()
  activeDelegations: number;

  @ApiProperty()
  revokedDelegations: number;

  @ApiProperty()
  chainBreakdown: Record<number, number>;
}

export class LinkDelegationToStrategyDto {
  @ApiProperty({
    description: 'Strategy ID to link this delegation to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  strategyId: string;
}
