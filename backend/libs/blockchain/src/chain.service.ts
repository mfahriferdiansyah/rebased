import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
  Address,
  Chain,
  Transport,
  Account,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet, baseSepoliaTestnet, SupportedChain, getChainById } from './chains';

interface ChainClients {
  public: PublicClient;
  wallet: WalletClient;
  chain: Chain;
}

@Injectable()
export class ChainService implements OnModuleInit {
  private readonly logger = new Logger(ChainService.name);
  private clients = new Map<SupportedChain, ChainClients>();
  private account: Account | null = null;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Initializing blockchain clients...');

    // Initialize bot account if private key is provided
    const botPrivateKey = this.config.get<string>('bot.privateKey');
    if (botPrivateKey) {
      try {
        this.account = privateKeyToAccount(botPrivateKey as `0x${string}`);
        this.logger.log(`✅ Bot account initialized: ${this.account.address}`);
      } catch (error) {
        this.logger.warn('⚠️  No valid bot private key provided. Bot functionality will be limited.');
      }
    }

    // Initialize Monad
    try {
      const monadRpc = this.config.get<string>('blockchain.monad.rpcUrl');
      if (monadRpc) {
        const publicClient = createPublicClient({
          chain: monadTestnet,
          transport: http(monadRpc),
        });

        const walletClient = createWalletClient({
          chain: monadTestnet,
          transport: http(monadRpc),
          account: this.account,
        });

        this.clients.set('monad', {
          public: publicClient as any,
          wallet: walletClient as any,
          chain: monadTestnet,
        });
        this.logger.log('✅ Monad Testnet client initialized');
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize Monad client', error);
    }

    // Initialize Base
    try {
      const baseRpc = this.config.get<string>('blockchain.base.rpcUrl');
      if (baseRpc) {
        const publicClient = createPublicClient({
          chain: baseSepoliaTestnet,
          transport: http(baseRpc),
        });

        const walletClient = createWalletClient({
          chain: baseSepoliaTestnet,
          transport: http(baseRpc),
          account: this.account,
        });

        this.clients.set('base', {
          public: publicClient as any,
          wallet: walletClient as any,
          chain: baseSepoliaTestnet,
        });
        this.logger.log('✅ Base Sepolia client initialized');
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize Base client', error);
    }

    this.logger.log(`Blockchain clients initialized for ${this.clients.size} chains`);
  }

  /**
   * Get public client by chain name
   */
  getPublicClient(chain: SupportedChain): PublicClient {
    const clients = this.clients.get(chain);
    if (!clients) {
      throw new Error(`Chain ${chain} not initialized`);
    }
    return clients.public;
  }

  /**
   * Get public client by chain ID
   */
  getPublicClientById(chainId: number): PublicClient {
    const chain = getChainById(chainId);
    if (!chain) {
      throw new Error(`Chain ID ${chainId} not supported`);
    }
    return this.getPublicClient(chain);
  }

  /**
   * Get wallet client by chain name
   */
  getWalletClient(chain: SupportedChain): WalletClient {
    const clients = this.clients.get(chain);
    if (!clients) {
      throw new Error(`Chain ${chain} not initialized`);
    }
    if (!clients.wallet.account) {
      throw new Error(`Wallet client for ${chain} requires bot private key`);
    }
    return clients.wallet;
  }

  /**
   * Get wallet client by chain ID
   */
  getWalletClientById(chainId: number): WalletClient {
    const chain = getChainById(chainId);
    if (!chain) {
      throw new Error(`Chain ID ${chainId} not supported`);
    }
    return this.getWalletClient(chain);
  }

  /**
   * Get chain config by name
   */
  getChainConfig(chain: SupportedChain): Chain {
    const clients = this.clients.get(chain);
    if (!clients) {
      throw new Error(`Chain ${chain} not initialized`);
    }
    return clients.chain;
  }

  /**
   * Get bot account address
   */
  getBotAddress(): Address | null {
    return this.account?.address || null;
  }

  /**
   * Check if bot account is initialized
   */
  hasBotAccount(): boolean {
    return this.account !== null;
  }

  /**
   * Get all initialized chains
   */
  getInitializedChains(): SupportedChain[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Check if chain is initialized
   */
  isChainInitialized(chain: SupportedChain): boolean {
    return this.clients.has(chain);
  }

  /**
   * Get current block number
   */
  async getCurrentBlock(chain: SupportedChain): Promise<bigint> {
    const client = this.getPublicClient(chain);
    return await client.getBlockNumber();
  }

  /**
   * Wait for transaction receipt
   */
  async waitForTransaction(chain: SupportedChain, hash: `0x${string}`) {
    const client = this.getPublicClient(chain);
    return await client.waitForTransactionReceipt({ hash });
  }
}
