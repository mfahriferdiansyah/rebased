import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GetNonceDto, VerifySignatureDto, AuthResponseDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get nonce for SIWE authentication',
    description: 'Generate a unique nonce for the given Ethereum address. This nonce must be used in the SIWE message.',
  })
  @ApiResponse({
    status: 200,
    description: 'Nonce generated successfully',
    schema: {
      properties: {
        nonce: { type: 'string', example: '1234567890abcdef' },
      },
    },
  })
  async getNonce(@Body() dto: GetNonceDto) {
    return this.authService.getNonce(dto.address);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify SIWE signature and get JWT',
    description:
      'Verify the signed SIWE message and return a JWT access token. The message must include the nonce from /auth/nonce.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid signature or nonce',
  })
  async verifySignature(@Body() dto: VerifySignatureDto): Promise<AuthResponseDto> {
    return this.authService.verifySignature(dto.message, dto.signature);
  }
}
