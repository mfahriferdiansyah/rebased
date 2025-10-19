import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WalletAuth } from '@app/common/decorators/wallet-auth.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { RebalancesService } from './rebalances.service';
import {
  GetRebalancesQueryDto,
  RebalanceResponseDto,
  RebalanceStatus,
} from './dto/rebalance.dto';

@ApiTags('rebalances')
@Controller('rebalances')
@WalletAuth()
export class RebalancesController {
  constructor(private readonly rebalancesService: RebalancesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all rebalances for current user' })
  @ApiQuery({ name: 'strategyId', required: false, type: String })
  @ApiQuery({ name: 'chainId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: RebalanceStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of rebalances',
    type: [RebalanceResponseDto],
  })
  async findAll(
    @CurrentUser() user: any,
    @Query() query: GetRebalancesQueryDto,
  ): Promise<{ data: RebalanceResponseDto[]; total: number }> {
    return this.rebalancesService.findAll(user.address, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get rebalance statistics for current user' })
  @ApiQuery({ name: 'chainId', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Rebalance statistics',
  })
  async getStats(
    @CurrentUser() user: any,
    @Query('chainId') chainId?: number,
  ) {
    return this.rebalancesService.getStats(user.address, chainId ? +chainId : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific rebalance' })
  @ApiResponse({
    status: 200,
    description: 'Rebalance details',
    type: RebalanceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Rebalance not found' })
  @ApiResponse({ status: 403, description: 'Not authorized to view this rebalance' })
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<RebalanceResponseDto> {
    return this.rebalancesService.findOne(id, user.address);
  }
}
