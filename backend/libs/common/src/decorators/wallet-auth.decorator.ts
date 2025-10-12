import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { WalletAuthGuard } from '../guards/wallet-auth.guard';

export function WalletAuth() {
  return applyDecorators(
    UseGuards(WalletAuthGuard),
    ApiBearerAuth(),
  );
}
