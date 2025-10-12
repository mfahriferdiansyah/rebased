import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEthereumAddress } from 'class-validator';

export class GetNonceDto {
  @ApiProperty({
    description: 'Ethereum address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  address: string;
}

export class VerifySignatureDto {
  @ApiProperty({
    description: 'SIWE message',
    example:
      'localhost:3000 wants you to sign in with your Ethereum account:\n0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb\n\nSign in to Rebased\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1\nNonce: 12345678\nIssued At: 2024-01-01T00:00:00.000Z',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Signature from MetaMask',
    example: '0x...',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'User Ethereum address' })
  address: string;

  @ApiProperty({ description: 'Token expiration timestamp' })
  expiresAt: number;
}
