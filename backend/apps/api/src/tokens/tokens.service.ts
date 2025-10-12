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

      // Organize tokens by chainId
      for (const [chainIdStr, tokens] of Object.entries(tokensData.tokens)) {
        const chainId = parseInt(chainIdStr);
        this.tokensMap.set(chainId, tokens);
        this.allTokens.push(...tokens);
      }

      this.logger.log(`✅ Loaded ${this.allTokens.length} tokens across ${this.tokensMap.size} chains`);
    } catch (error) {
      this.logger.error('❌ Failed to load tokens.json', error);
      throw error;
    }
  }

  /**
   * Get all tokens, optionally filtered by chain(s)
   */
  findAll(chainIds?: number[]): TokenDto[] {
    let tokens: TokenDto[];

    if (chainIds && chainIds.length > 0) {
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

      tokens = filtered;
    } else {
      tokens = this.allTokens;
    }

    // Ensure logoUri is included in response by mapping logoURI -> logoUri
    return tokens.map(token => ({
      ...token,
      logoUri: token.logoURI,
    }));
  }

  /**
   * Get a specific token by address and chain
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

    // Ensure logoUri is included in response
    return {
      ...token,
      logoUri: token.logoURI,
    };
  }

  /**
   * Search tokens by symbol or name, optionally filtered by chain(s)
   */
  search(query: string, chainIds?: number[]): TokenDto[] {
    const lowerQuery = query.toLowerCase();
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

    const results = searchPool.filter(
      (token) =>
        token.symbol.toLowerCase().includes(lowerQuery) ||
        token.name.toLowerCase().includes(lowerQuery),
    );

    // Ensure logoUri is included in response
    return results.map(token => ({
      ...token,
      logoUri: token.logoURI,
    }));
  }
}
