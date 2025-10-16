import { waitForTransactionReceipt } from '@wagmi/core';
import type { Config } from '@wagmi/core';
import type { Hash } from 'viem';

/**
 * Wait for transaction receipt with retry logic
 *
 * This is especially useful for Monad testnet where RPC nodes
 * may take time to index transactions even after they're confirmed.
 *
 * @param config - Wagmi config
 * @param hash - Transaction hash
 * @param retries - Number of retry attempts (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 3000)
 * @returns Transaction receipt
 */
export async function waitForTransactionReceiptWithRetry(
  config: Config,
  hash: Hash,
  retries: number = 3,
  delayMs: number = 3000
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Receipt Retry ${attempt}/${retries}] Attempting to fetch receipt for ${hash}`);

      const receipt = await waitForTransactionReceipt(config, {
        hash,
        timeout: 30_000, // 30 second timeout per attempt
      });

      console.log(`[Receipt Retry ${attempt}/${retries}] ✅ Receipt found, status: ${receipt.status}`);
      return receipt;

    } catch (error: any) {
      lastError = error;
      console.warn(`[Receipt Retry ${attempt}/${retries}] ⚠️ Failed to fetch receipt:`, error.message);

      // If this isn't the last attempt, wait and retry
      if (attempt < retries) {
        console.log(`[Receipt Retry ${attempt}/${retries}] Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted
  console.error(`[Receipt Retry] ❌ All ${retries} attempts failed for ${hash}`);
  throw new Error(
    `Transaction receipt not found after ${retries} attempts. ` +
    `This may be a temporary RPC issue. Transaction hash: ${hash}. ` +
    `Original error: ${lastError?.message || 'Unknown error'}`
  );
}
