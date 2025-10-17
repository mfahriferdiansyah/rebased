export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  blockchain: {
    monad: {
      rpcUrl: process.env.MONAD_RPC_URL,
      chainId: 10143,
      startBlock: parseInt(process.env.MONAD_START_BLOCK, 10) || 0,
      contracts: {
        registry: process.env.MONAD_REGISTRY,
        executor: process.env.MONAD_EXECUTOR,
        oracle: process.env.MONAD_ORACLE,
        uniswapHelper: process.env.MONAD_UNISWAP_HELPER,
        config: process.env.MONAD_CONFIG,
        delegationManager: process.env.MONAD_DELEGATION_MANAGER,
      },
    },
    base: {
      rpcUrl: process.env.BASE_RPC_URL,
      chainId: 84532,
      startBlock: parseInt(process.env.BASE_START_BLOCK, 10) || 0,
      contracts: {
        registry: process.env.BASE_REGISTRY,
        executor: process.env.BASE_EXECUTOR,
        oracle: process.env.BASE_ORACLE,
        uniswapHelper: process.env.BASE_UNISWAP_HELPER,
        config: process.env.BASE_CONFIG,
        delegationManager: process.env.BASE_DELEGATION_MANAGER,
      },
    },
  },

  bot: {
    privateKey: process.env.BOT_PRIVATE_KEY,
    monitoringInterval: parseInt(process.env.MONITORING_INTERVAL, 10) || 30000,
    maxSlippageBps: parseInt(process.env.MAX_SLIPPAGE_BPS, 10) || 100,
    gasReimbursement: process.env.GAS_REIMBURSEMENT || '0.01',
    maxGasPrice: BigInt(process.env.MAX_GAS_PRICE || '500000000000'), // 500 gwei default for testnet
    gasPriceMultiplier: parseFloat(process.env.GAS_PRICE_MULTIPLIER || '1.1'),
  },

  dex: {
    enable1inch: process.env.ENABLE_1INCH === 'true',
    enable0x: process.env.ENABLE_0X === 'true',
    enableParaSwap: process.env.ENABLE_PARASWAP === 'true',
    fallbackUniswap: process.env.FALLBACK_UNISWAP !== 'false',
    oneinchApiKey: process.env.ONEINCH_API_KEY,
    oneinchRouter: process.env.ONEINCH_ROUTER_V5,
    zeroxApiKey: process.env.ZEROX_API_KEY,
    zeroxApiUrl: process.env.ZEROX_API_URL || 'https://api.0x.org',
    zeroxExchangeProxy: process.env.ZEROX_EXCHANGE_PROXY,
    paraswapAugustus: process.env.PARASWAP_AUGUSTUS,
  },

  mev: {
    enableFlashbots: process.env.ENABLE_FLASHBOTS === 'true',
    flashbotsRpc: process.env.FLASHBOTS_RPC || 'https://rpc.flashbots.net',
    enableIntents: process.env.ENABLE_INTENTS === 'true',
    enableTee: process.env.ENABLE_TEE === 'true',
  },

  gasOracle: {
    ethgasstationApiKey: process.env.ETHGASSTATION_API_KEY,
    blocknativeApiKey: process.env.BLOCKNAATIVE_API_KEY,
  },

  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    metricsPort: parseInt(process.env.METRICS_PORT, 10) || 9090,
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
  },

  rateLimit: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  },
});
