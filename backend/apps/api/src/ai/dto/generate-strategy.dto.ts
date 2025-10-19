import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsObject, IsArray } from 'class-validator';

export class GenerateStrategyDto {
  @ApiProperty({
    description: 'User intent describing the desired strategy',
    example: 'Create a 60/40 ETH and USDC portfolio that rebalances every hour',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  intent: string;

  @ApiProperty({
    description: 'Current strategy on canvas (if any) for context-aware modifications',
    required: false,
  })
  @IsOptional()
  @IsObject()
  currentStrategy?: any;

  @ApiProperty({
    description: 'Chat conversation history for context',
    required: false,
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  conversationHistory?: Array<{ role: string; content: string }>;
}
