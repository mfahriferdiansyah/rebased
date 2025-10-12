import { Controller, Get, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { TokensService } from './tokens.service';
import { TokenDto, TokenListResponseDto, ChainId } from './dto/token.dto';

@ApiTags('tokens')
@Controller('tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all supported tokens' })
  @ApiQuery({
    name: 'chainId',
    required: false,
    description: 'Filter by chain ID(s). Single: 10143 or multiple (comma-separated): 10143,84532',
    type: String,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search tokens by symbol or name',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of tokens',
    type: TokenListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No tokens found for specified chain(s)',
  })
  findAll(
    @Query('chainId') chainId?: string,
    @Query('search') search?: string,
  ): TokenListResponseDto {
    let tokens: TokenDto[];

    // Parse comma-separated chain IDs
    const chainIds = chainId
      ? chainId.split(',').map((id) => parseInt(id.trim())).filter((id) => !isNaN(id))
      : undefined;

    if (search) {
      tokens = this.tokensService.search(search, chainIds);
    } else {
      tokens = this.tokensService.findAll(chainIds);
    }

    return {
      tokens,
      count: tokens.length,
    };
  }

  @Get(':chainId/:address')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a specific token by address and chain' })
  @ApiParam({
    name: 'chainId',
    description: 'Chain ID (10143 for Monad, 84532 for Base Sepolia)',
    enum: ChainId,
  })
  @ApiParam({
    name: 'address',
    description: 'Token contract address',
    example: '0x4200000000000000000000000000000000000006',
  })
  @ApiResponse({
    status: 200,
    description: 'Token details',
    type: TokenDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Token not found',
  })
  findOne(
    @Param('chainId') chainId: string,
    @Param('address') address: string,
  ): TokenDto {
    return this.tokensService.findOne(address, +chainId);
  }
}
