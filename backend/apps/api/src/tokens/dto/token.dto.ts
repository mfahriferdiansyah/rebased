import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsUrl, IsOptional } from 'class-validator';

export enum ChainId {
  ETHEREUM = 1,
  BASE_MAINNET = 8453,
  BASE_SEPOLIA = 84532,
  MONAD = 10143,
  MONAD_TESTNET = 10143,
}

export class TokenDto {
  @ApiProperty({ example: '0x...' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'WETH' })
  @IsString()
  symbol: string;

  @ApiProperty({ example: 'Wrapped Ether' })
  @IsString()
  name: string;

  @ApiProperty({ example: 18 })
  @IsNumber()
  decimals: number;

  @ApiProperty({ example: 10143 })
  @IsNumber()
  chainId: number;

  @ApiProperty({
    example: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    required: false,
  })
  @IsUrl({ require_protocol: true }, { message: 'logoURI must be a valid URL' })
  @IsOptional()
  logoURI?: string;

  // Alias for backward compatibility with frontend
  get logoUri(): string | undefined {
    return this.logoURI;
  }

  @ApiProperty({ example: '4322.92', required: false })
  @IsString()
  @IsOptional()
  priceUSD?: string;

  @ApiProperty({ example: 'ETH', required: false })
  @IsString()
  @IsOptional()
  coinKey?: string;

  @ApiProperty({ example: 522089413065, required: false })
  @IsNumber()
  @IsOptional()
  marketCapUSD?: number;

  @ApiProperty({ example: 42347785760, required: false })
  @IsNumber()
  @IsOptional()
  volumeUSD24H?: number;

  @ApiProperty({ example: 522089413065, required: false })
  @IsNumber()
  @IsOptional()
  fdvUSD?: number;

  @ApiProperty({ example: 'Native ETH wrapped for trading', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'https://weth.io', required: false })
  @IsUrl()
  @IsOptional()
  website?: string;
}

export class TokenListResponseDto {
  @ApiProperty({ type: [TokenDto] })
  tokens: TokenDto[];

  @ApiProperty({ example: 10 })
  count: number;
}
