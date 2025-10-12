import { Module } from '@nestjs/common';
import { DexService } from './dex.service';

@Module({
  providers: [DexService],
  exports: [DexService],
})
export class DexModule {}
