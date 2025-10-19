import { Module } from '@nestjs/common';
import { RebalancesController } from './rebalances.controller';
import { RebalancesService } from './rebalances.service';

@Module({
  controllers: [RebalancesController],
  providers: [RebalancesService],
  exports: [RebalancesService],
})
export class RebalancesModule {}
