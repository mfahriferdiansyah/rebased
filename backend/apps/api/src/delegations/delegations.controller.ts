import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WalletAuth } from '@app/common/decorators/wallet-auth.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { DelegationsService } from './delegations.service';
import {
  CreateDelegationDto,
  RevokeDelegationDto,
  DelegationResponseDto,
  DelegationStatsDto,
  LinkDelegationToStrategyDto,
} from './dto/delegation.dto';

@ApiTags('delegations')
@Controller('delegations')
// @WalletAuth() // TODO: Implement proper Privy token verification with @privy-io/server-auth
export class DelegationsController {
  constructor(private readonly delegationsService: DelegationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new delegation',
    description:
      'Sign and submit an ERC-7710 delegation to allow the bot to execute rebalances on your behalf',
  })
  @ApiResponse({
    status: 201,
    description: 'Delegation created successfully',
    type: DelegationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid signature or delegation data',
  })
  async create(
    // @CurrentUser() user: any, // TODO: Re-enable when Privy auth is fixed
    @Body() createDelegationDto: CreateDelegationDto,
  ): Promise<DelegationResponseDto> {
    // Extract user address from delegation data (verified by signature)
    // The delegationData contains the delegator address which is verified by EIP-712 signature
    // For now, we'll recover it from the signature in the service
    return this.delegationsService.create(null, createDelegationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all delegations for current user' })
  @ApiQuery({ name: 'userAddress', required: false, type: String })
  @ApiQuery({ name: 'chainId', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'List of delegations',
    type: [DelegationResponseDto],
  })
  async findAll(
    // @CurrentUser() user: any, // TODO: Re-enable when Privy auth is fixed
    @Query('userAddress') userAddress?: string,
    @Query('chainId') chainId?: number,
    @Query('isActive') isActive?: boolean,
  ): Promise<DelegationResponseDto[]> {
    // Temporarily accept userAddress from query param
    // TODO: Get from authenticated user once Privy auth is implemented
    if (!userAddress) {
      return []; // Return empty array if no address provided
    }
    return this.delegationsService.findAll(
      userAddress,
      chainId ? +chainId : undefined,
      isActive,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get delegation statistics' })
  @ApiQuery({ name: 'userAddress', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Delegation statistics',
    type: DelegationStatsDto,
  })
  async getStats(
    // @CurrentUser() user: any, // TODO: Re-enable when Privy auth is fixed
    @Query('userAddress') userAddress?: string,
  ): Promise<DelegationStatsDto> {
    // Temporarily accept userAddress from query param
    if (!userAddress) {
      return {
        totalDelegations: 0,
        activeDelegations: 0,
        revokedDelegations: 0,
        chainBreakdown: {},
      };
    }
    return this.delegationsService.getStats(userAddress);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific delegation' })
  @ApiQuery({ name: 'userAddress', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Delegation details',
    type: DelegationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Delegation not found' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to view this delegation',
  })
  async findOne(
    // @CurrentUser() user: any, // TODO: Re-enable when Privy auth is fixed
    @Param('id') id: string,
    @Query('userAddress') userAddress?: string,
  ): Promise<DelegationResponseDto> {
    return this.delegationsService.findOne(id, userAddress);
  }

  @Patch(':id/link-strategy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Link delegation to a strategy',
    description: 'Attach an existing delegation to a strategy for automated rebalancing',
  })
  @ApiResponse({
    status: 200,
    description: 'Delegation linked to strategy successfully',
    type: DelegationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Delegation or strategy not found' })
  @ApiResponse({
    status: 400,
    description: 'Delegation and strategy must be on same chain',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to link this delegation or strategy',
  })
  async linkToStrategy(
    // @CurrentUser() user: any, // TODO: Re-enable when Privy auth is fixed
    @Param('id') id: string,
    @Body() dto: LinkDelegationToStrategyDto,
    @Query('userAddress') userAddress?: string,
  ): Promise<DelegationResponseDto> {
    return this.delegationsService.linkToStrategy(id, dto.strategyId, userAddress);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke a delegation',
    description: 'Revoke bot access to execute rebalances for this delegation',
  })
  @ApiResponse({ status: 200, description: 'Delegation revoked successfully' })
  @ApiResponse({ status: 404, description: 'Delegation not found' })
  async revoke(
    // @CurrentUser() user: any, // TODO: Re-enable when Privy auth is fixed
    @Param('id') id: string,
    @Body('userAddress') userAddress?: string,
  ) {
    return this.delegationsService.revoke(id, userAddress);
  }
}
