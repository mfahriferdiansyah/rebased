import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SiweMessage } from 'siwe';
import { PrismaService } from '@app/database';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate a nonce for SIWE authentication
   */
  async getNonce(address: string): Promise<{ nonce: string }> {
    const normalizedAddress = address.toLowerCase();
    const nonce = randomBytes(16).toString('hex');

    // Upsert user with new nonce
    await this.prisma.user.upsert({
      where: { address: normalizedAddress },
      update: { nonce },
      create: {
        address: normalizedAddress,
        nonce,
      },
    });

    return { nonce };
  }

  /**
   * Verify SIWE signature and issue JWT
   */
  async verifySignature(message: string, signature: string) {
    try {
      // Parse SIWE message
      const siweMessage = new SiweMessage(message);

      // Verify signature
      const fields = await siweMessage.verify({ signature });

      if (!fields.success) {
        throw new UnauthorizedException('Invalid signature');
      }

      const address = siweMessage.address.toLowerCase();

      // Verify nonce matches database
      const user = await this.prisma.user.findUnique({
        where: { address },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.nonce !== siweMessage.nonce) {
        throw new UnauthorizedException('Invalid nonce');
      }

      // Generate new nonce to prevent replay attacks
      const newNonce = randomBytes(16).toString('hex');
      await this.prisma.user.update({
        where: { address },
        data: { nonce: newNonce },
      });

      // Generate JWT
      const payload = {
        sub: address,
        address,
        chainId: siweMessage.chainId,
      };

      const accessToken = this.jwt.sign(payload);
      const expiresIn = this.config.get<string>('jwt.expiresIn', '7d');
      const expiresAt = this.calculateExpiration(expiresIn);

      return {
        accessToken,
        address,
        expiresAt,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(`SIWE verification failed: ${error.message}`);
    }
  }

  /**
   * Calculate JWT expiration timestamp
   */
  private calculateExpiration(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return Date.now() + 7 * 24 * 60 * 60 * 1000; // Default 7 days

    const [, value, unit] = match;
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const duration = parseInt(value) * multipliers[unit];

    return Date.now() + duration;
  }
}
