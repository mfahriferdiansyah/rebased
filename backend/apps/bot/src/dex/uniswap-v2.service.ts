import { Injectable, Logger } from '@nestjs/common';
import { ChainService } from '@app/blockchain';
import { SupportedChain } from '@app/blockchain/chains';
import { encodeFunctionData, parseAbiParameters } from 'viem';

interface UniswapV2Quote {
  amountIn: bigint;
  amountOut: bigint;
  path: string[];
  router: string;
  calldata: string;
  priceImpact: number;
}

const UNISWAP_V2_ROUTER_ABI = [
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Direct Uniswap V2 integration for chains not supported by aggregators
 * Primary use case: Monad testnet
 */
@Injectable()
export class UniswapV2Service {
  private readonly logger = new Logger(UniswapV2Service.name);

  // Uniswap V2 router addresses per chain
  private readonly ROUTERS = {
    monad: '0xfb8e1c3b833f9e67a71c859a132cf783b645e436' as `0x${string}`,
    base: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' as `0x${string}`,
  };

  // Common intermediate tokens for path finding
  private readonly WETH_ADDRESSES = {
    monad: '0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37' as `0x${string}`, // WETH on Monad testnet
    base: '0x4200000000000000000000000000000000000006' as `0x${string}`, // WETH on Base
  };

  constructor(private readonly chain: ChainService) {}

  /**
   * Get quote from Uniswap V2
   */
  async getQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    chain: SupportedChain,
  ): Promise<UniswapV2Quote | null> {
    try {
      const router = this.ROUTERS[chain];
      if (!router) {
        this.logger.warn(`No Uniswap V2 router for chain ${chain}`);
        return null;
      }

      this.logger.debug(
        `Getting Uniswap V2 quote: ${tokenIn} -> ${tokenOut} on ${chain}`,
      );

      const publicClient = this.chain.getPublicClient(chain);

      // Try direct path first
      let path = [tokenIn as `0x${string}`, tokenOut as `0x${string}`];
      let amountsOut: bigint[];

      try {
        const result = await publicClient.readContract({
          address: router,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [amountIn, path],
          authorizationList: undefined,
        } as any);
        amountsOut = result as unknown as bigint[];
      } catch (error) {
        // Direct path failed, try through WETH
        this.logger.debug('Direct path failed, trying through WETH');
        const weth = this.WETH_ADDRESSES[chain];

        if (!weth || weth === '0x...') {
          throw new Error('WETH address not configured for chain');
        }

        path = [
          tokenIn as `0x${string}`,
          weth,
          tokenOut as `0x${string}`,
        ];

        const result = await publicClient.readContract({
          address: router,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [amountIn, path],
          authorizationList: undefined,
        } as any);
        amountsOut = result as unknown as bigint[];
      }

      const amountOut = amountsOut[amountsOut.length - 1];

      // Calculate price impact
      const priceImpact = this.calculatePriceImpact(amountIn, amountOut);

      // Build swap calldata
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30 min deadline
      const minAmountOut = (amountOut * 99n) / 100n; // 1% slippage

      const calldata = encodeFunctionData({
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [
          amountIn,
          minAmountOut,
          path,
          '0x0000000000000000000000000000000000000000' as `0x${string}`, // Will be replaced with user address
          deadline,
        ],
      });

      this.logger.log(
        `Uniswap V2 quote: ${amountOut} output (${priceImpact.toFixed(2)}% impact)`,
      );

      return {
        amountIn,
        amountOut,
        path: path.map(addr => addr.toString()),
        router,
        calldata,
        priceImpact,
      };
    } catch (error) {
      this.logger.error(`Uniswap V2 quote failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Build swap transaction for execution
   */
  buildSwapTransaction(
    quote: UniswapV2Quote,
    userAccount: string,
    slippageBps: number = 100, // 1%
  ): {
    target: string;
    calldata: string;
    minOutput: bigint;
  } {
    // Adjust min output for slippage
    const slippageMultiplier = BigInt(10000 - slippageBps);
    const minOutput = (quote.amountOut * slippageMultiplier) / 10000n;

    // Rebuild calldata with actual user address
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

    const calldata = encodeFunctionData({
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [
        quote.amountIn, // Amount of input token to swap (FIXED: was incorrectly using amountOut)
        minOutput,
        quote.path as `0x${string}`[],
        userAccount as `0x${string}`,
        deadline,
      ],
    });

    return {
      target: quote.router,
      calldata,
      minOutput,
    };
  }

  /**
   * Calculate price impact
   */
  private calculatePriceImpact(amountIn: bigint, amountOut: bigint): number {
    // Simplified - assumes 1:1 pricing
    // In production, fetch actual spot prices
    const inValue = Number(amountIn) / 1e18;
    const outValue = Number(amountOut) / 1e18;
    return Math.abs((inValue - outValue) / inValue) * 100;
  }

  /**
   * Get reserves for a pair (useful for price impact calculation)
   */
  async getReserves(
    tokenA: string,
    tokenB: string,
    chain: SupportedChain,
  ): Promise<{ reserve0: bigint; reserve1: bigint } | null> {
    // TODO: Implement if needed for better price impact calculation
    return null;
  }

  /**
   * Check if Uniswap V2 is available on chain
   */
  isAvailable(chain: SupportedChain): boolean {
    return !!this.ROUTERS[chain] && this.ROUTERS[chain] !== ('0x...' as `0x${string}`);
  }

  /**
   * Get router address for chain
   */
  getRouterAddress(chain: SupportedChain): string | null {
    return this.ROUTERS[chain] || null;
  }
}
