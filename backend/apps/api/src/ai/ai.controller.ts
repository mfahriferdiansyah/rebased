import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WalletAuth } from '@app/common/decorators/wallet-auth.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { GenerateStrategyDto } from './dto/generate-strategy.dto';

@ApiTags('ai')
@Controller('ai')
@WalletAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-strategy')
  @ApiOperation({ summary: 'Generate strategy from natural language intent' })
  @ApiResponse({
    status: 201,
    description: 'Strategy generated successfully',
  })
  async generateStrategy(
    @CurrentUser() user: any,
    @Body() dto: GenerateStrategyDto,
  ) {
    return this.aiService.generateStrategyFromIntent(
      dto.intent,
      dto.currentStrategy,
      dto.conversationHistory,
    );
  }
}
