import { Module, Global } from '@nestjs/common';
import { ChainService } from './chain.service';
import { PythOracleService } from './pyth-oracle.service';

@Global()
@Module({
  providers: [ChainService, PythOracleService],
  exports: [ChainService, PythOracleService],
})
export class BlockchainModule {}
