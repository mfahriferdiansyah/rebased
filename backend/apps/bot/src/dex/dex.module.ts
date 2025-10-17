import { Module } from '@nestjs/common';
import { BlockchainModule } from '@app/blockchain';
import { DexService } from './dex.service';
import { UniswapV2Service } from './uniswap-v2.service';
import { MonorailService } from './monorail.service';

@Module({
  imports: [BlockchainModule],
  providers: [DexService, UniswapV2Service, MonorailService],
  exports: [DexService],
})
export class DexModule {}
