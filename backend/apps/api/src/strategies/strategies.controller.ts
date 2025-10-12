import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WalletAuth } from '@app/common/decorators/wallet-auth.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { AddressValidationPipe } from '@app/common/pipes/address-validation.pipe';
import { StrategiesService } from './strategies.service';
import {
  CreateStrategyDto,
  UpdateStrategyDto,
  StrategyResponseDto,
} from './dto/strategy.dto';

@ApiTags('strategies')
@Controller('strategies')
@WalletAuth()
export class StrategiesController {
  constructor(private readonly strategiesService: StrategiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new strategy' })
  @ApiResponse({
    status: 201,
    description: 'Strategy created successfully',
    type: StrategyResponseDto,
  })
  async create(
    @CurrentUser() user: any,
    @Body() createStrategyDto: CreateStrategyDto,
  ): Promise<StrategyResponseDto> {
    return this.strategiesService.create(user.address, createStrategyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all strategies for current user' })
  @ApiQuery({ name: 'chainId', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of strategies',
    type: [StrategyResponseDto],
  })
  async findAll(
    @CurrentUser() user: any,
    @Query('chainId') chainId?: number,
  ): Promise<StrategyResponseDto[]> {
    return this.strategiesService.findAll(user.address, chainId ? +chainId : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific strategy' })
  @ApiResponse({
    status: 200,
    description: 'Strategy details',
    type: StrategyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  @ApiResponse({ status: 403, description: 'Not authorized to view this strategy' })
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<StrategyResponseDto> {
    return this.strategiesService.findOne(id, user.address);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a strategy' })
  @ApiResponse({
    status: 200,
    description: 'Strategy updated successfully',
    type: StrategyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateStrategyDto: UpdateStrategyDto,
  ): Promise<StrategyResponseDto> {
    return this.strategiesService.update(id, user.address, updateStrategyDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a strategy' })
  @ApiResponse({ status: 200, description: 'Strategy deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.strategiesService.remove(id, user.address);
  }
}
