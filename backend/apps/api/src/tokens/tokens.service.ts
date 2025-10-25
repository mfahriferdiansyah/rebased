import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { TokenDto } from './dto/token.dto';
import * as fs from 'fs';
import * as path from 'path';

interface TokensData {
  tokens: {
    [chainId: string]: TokenDto[];
  };
}

@Injectable()
export class TokensService implements OnModuleInit {
  private readonly logger = new Logger(TokensService.name);
  private tokensMap: Map<number, TokenDto[]> = new Map();
  private allTokens: TokenDto[] = [];

  async onModuleInit() {
    this.logger.log('Loading tokens from tokens.json...');

    try {
      // Load tokens.json from backend root directory
      const tokensPath = path.join(process.cwd(), 'tokens.json');
      const rawData = fs.readFileSync(tokensPath, 'utf-8');
      const tokensData: TokensData = JSON.parse(rawData);

      // Pre-process tokens: add logoUri field and collect all tokens
      for (const [chainIdStr, tokens] of Object.entries(tokensData.tokens)) {
        const chainId = parseInt(chainIdStr);

        // Pre-process each token: add logoUri field
        const processedTokens = tokens.map(token => ({
          ...token,
          logoUri: token.logoURI,
        }));

        this.tokensMap.set(chainId, processedTokens);
        this.allTokens.push(...processedTokens);
      }

      // Pre-sort all tokens once: Base Mainnet (8453) first, then others by chainId
      this.allTokens.sort((a, b) => {
        if (a.chainId === 8453 && b.chainId !== 8453) return -1;
        if (a.chainId !== 8453 && b.chainId === 8453) return 1;
        return a.chainId - b.chainId;
      });

      // Pre-sort tokens in each chain's map
      for (const [chainId, tokens] of this.tokensMap.entries()) {
        tokens.sort((a, b) => {
          if (a.chainId === 8453 && b.chainId !== 8453) return -1;
          if (a.chainId !== 8453 && b.chainId === 8453) return 1;
          return a.chainId - b.chainId;
        });
      }

      this.logger.log(`✅ Loaded ${this.allTokens.length} tokens across ${this.tokensMap.size} chains (pre-sorted)`);
    } catch (error) {
      this.logger.error('❌ Failed to load tokens.json', error);
      throw error;
    }
  }

  /**
   * Get all tokens, optionally filtered by chain(s)
   * Returns pre-processed and pre-sorted tokens
   */
  findAll(chainIds?: number[]): TokenDto[] {
    // Return pre-sorted allTokens if no filter
    if (!chainIds || chainIds.length === 0) {
      return this.allTokens;
    }

    // Filter by chain IDs (already pre-sorted in tokensMap)
    const filtered: TokenDto[] = [];
    for (const chainId of chainIds) {
      const chainTokens = this.tokensMap.get(chainId);
      if (chainTokens && chainTokens.length > 0) {
        filtered.push(...chainTokens);
      }
    }

    if (filtered.length === 0) {
      throw new NotFoundException(
        `No tokens found for chain IDs ${chainIds.join(', ')}`,
      );
    }

    return filtered;
  }

  /**
   * Get a specific token by address and chain
   * Returns pre-processed token
   */
  findOne(address: string, chainId: number): TokenDto {
    const chainTokens = this.tokensMap.get(chainId);
    if (!chainTokens) {
      throw new NotFoundException(
        `No tokens found for chain ID ${chainId}`,
      );
    }

    const token = chainTokens.find(
      (t) => t.address.toLowerCase() === address.toLowerCase(),
    );

    if (!token) {
      throw new NotFoundException(
        `Token ${address} not found on chain ${chainId}`,
      );
    }

    return token;
  }

  /**
   * Search tokens by symbol or name, optionally filtered by chain(s)
   * Searches pre-processed tokens (already sorted)
   */
  search(query: string, chainIds?: number[]): TokenDto[] {
    const lowerQuery = query.toLowerCase();

    // Use pre-sorted tokens as search pool
    let searchPool: TokenDto[];
    if (chainIds && chainIds.length > 0) {
      searchPool = [];
      for (const chainId of chainIds) {
        const chainTokens = this.tokensMap.get(chainId);
        if (chainTokens) {
          searchPool.push(...chainTokens);
        }
      }
    } else {
      searchPool = this.allTokens;
    }

    // Filter by query (results maintain sort order from searchPool)
    return searchPool.filter(
      (token) =>
        token.symbol.toLowerCase().includes(lowerQuery) ||
        token.name.toLowerCase().includes(lowerQuery),
    );
  }
}
