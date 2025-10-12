import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // Blockchain - Monad
  MONAD_RPC_URL: Joi.string().required(),
  MONAD_START_BLOCK: Joi.number().default(0),

  // Blockchain - Base
  BASE_RPC_URL: Joi.string().required(),
  BASE_START_BLOCK: Joi.number().default(0),

  // Bot
  BOT_PRIVATE_KEY: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).optional().allow('', '0x...'),
  MONITORING_INTERVAL: Joi.number().default(30000),
  MAX_SLIPPAGE_BPS: Joi.number().default(100),

  // DEX
  ENABLE_1INCH: Joi.boolean().default(true),
  ENABLE_0X: Joi.boolean().default(true),
  ENABLE_PARASWAP: Joi.boolean().default(true),
  FALLBACK_UNISWAP: Joi.boolean().default(true),

  // MEV
  ENABLE_FLASHBOTS: Joi.boolean().default(false),
  FLASHBOTS_RPC: Joi.string().default('https://rpc.flashbots.net'),
  ENABLE_INTENTS: Joi.boolean().default(false),
  ENABLE_TEE: Joi.boolean().default(false),

  // Monitoring
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  ENABLE_METRICS: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().default(9090),

  // Rate Limiting
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:5173,http://localhost:3000'),
});
