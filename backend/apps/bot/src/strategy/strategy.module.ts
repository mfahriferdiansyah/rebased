import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { BlockchainModule } from '@app/blockchain';
import { StrategyParserService } from './strategy-parser.service';
import { PortfolioAnalyzerService } from './portfolio-analyzer.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { ActionPlannerService } from './action-planner.service';
import { StrategyEngineService } from './strategy-engine.service';

@Module({
  imports: [ConfigModule, DatabaseModule, BlockchainModule],
  providers: [
    StrategyParserService,
    PortfolioAnalyzerService,
    ConditionEvaluatorService,
    ActionPlannerService,
    StrategyEngineService,
  ],
  exports: [StrategyEngineService], // Only export the orchestrator
})
export class StrategyModule {}
