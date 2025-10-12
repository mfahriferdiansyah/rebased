import { Module, Global } from '@nestjs/common';
import { ChainService } from './chain.service';

@Global()
@Module({
  providers: [ChainService],
  exports: [ChainService],
})
export class BlockchainModule {}
