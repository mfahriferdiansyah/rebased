import { useState, useCallback } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import { Address, parseEther, formatUnits } from 'viem';
import { useAuth } from './useAuth';
import { toMetaMaskSmartAccount, Implementation } from '@metamask/delegation-toolkit';

export interface SmartAccountStatus {
  hasDeleGator: boolean;
  delegatorAddress: Address | null;
  isLoading: boolean;
  error: string | null;
}

export interface TokenBalance {
  address: Address;
  symbol: string;
  balance: bigint;
  decimals: number;
  formatted: string;
}

export interface DeleGatorBalances {
  native: bigint;
  tokens: TokenBalance[];
  totalValueUSD: number;
}

/**
 * useSmartAccount Hook
 *
 * Manages DeleGator smart account operations:
 * - Detecting if user has a DeleGator
 * - Creating new DeleGator accounts
 * - Getting DeleGator balances
 * - Transferring funds to DeleGator
 *
 * Note: Requires @metamask/delegation-toolkit to be installed
 */
export function useSmartAccount() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { getBackendToken } = useAuth();

  const [status, setStatus] = useState<SmartAccountStatus>({
    hasDeleGator: false,
    delegatorAddress: null,
    isLoading: false,
    error: null,
  });

  /**
   * Check if an address is a smart contract
   */
  const isSmartContract = useCallback(
    async (address: Address): Promise<boolean> => {
      if (!publicClient) return false;

      try {
        const code = await publicClient.getBytecode({ address });
        return code !== undefined && code !== '0x';
      } catch (error) {
        console.error('Failed to check if address is smart contract:', error);
        return false;
      }
    },
    [publicClient]
  );

  /**
   * Get DeleGator address for the connected user
   *
   * This checks if the user has an existing DeleGator smart account
   * by:
   * 1. Checking localStorage for cached address
   * 2. Verifying the cached address is a smart contract
   * 3. Checking if user address itself is a smart contract
   */
  const checkDeleGatorStatus = useCallback(
    async (userAddress: Address): Promise<SmartAccountStatus> => {
      if (!publicClient) {
        return {
          hasDeleGator: false,
          delegatorAddress: null,
          isLoading: false,
          error: 'Public client not available',
        };
      }

      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Method 1: Check localStorage for cached DeleGator address
        const storageKey = `delegator_${userAddress.toLowerCase()}`;
        const cachedAddress = localStorage.getItem(storageKey);

        if (cachedAddress && cachedAddress !== userAddress) {
          // Verify cached address is still a smart contract
          const isCachedContract = await isSmartContract(cachedAddress as Address);
          if (isCachedContract) {
            setStatus({
              hasDeleGator: true,
              delegatorAddress: cachedAddress as Address,
              isLoading: false,
              error: null,
            });

            return {
              hasDeleGator: true,
              delegatorAddress: cachedAddress as Address,
              isLoading: false,
              error: null,
            };
          } else {
            // Cached address is no longer valid, remove from storage
            localStorage.removeItem(storageKey);
          }
        }

        // Method 2: Check if user address itself is a DeleGator
        const isContract = await isSmartContract(userAddress);

        if (isContract) {
          // User's address is already a smart contract (e.g., existing DeleGator)
          // Cache it for future use
          localStorage.setItem(storageKey, userAddress);

          setStatus({
            hasDeleGator: true,
            delegatorAddress: userAddress,
            isLoading: false,
            error: null,
          });

          return {
            hasDeleGator: true,
            delegatorAddress: userAddress,
            isLoading: false,
            error: null,
          };
        }

        // Method 3: No DeleGator found
        setStatus({
          hasDeleGator: false,
          delegatorAddress: null,
          isLoading: false,
          error: null,
        });

        return {
          hasDeleGator: false,
          delegatorAddress: null,
          isLoading: false,
          error: null,
        };
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to check DeleGator status';
        setStatus({
          hasDeleGator: false,
          delegatorAddress: null,
          isLoading: false,
          error: errorMessage,
        });

        return {
          hasDeleGator: false,
          delegatorAddress: null,
          isLoading: false,
          error: errorMessage,
        };
      }
    },
    [publicClient, isSmartContract]
  );

  /**
   * Create a new DeleGator smart account
   *
   * Uses MetaMask Delegation Toolkit to deploy a DeleGator smart account.
   * The DeleGator will be owned by the connected EOA.
   * Caches the address in localStorage for future sessions.
   *
   * @returns The address of the newly created DeleGator
   */
  const createDeleGator = useCallback(
    async (ownerAddress: Address): Promise<Address> => {
      if (!publicClient || !walletClient) {
        throw new Error('Wallet not connected');
      }

      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // CRITICAL FIX: Validate wallet client is ready (handle stale state on page reload)
        if (!walletClient.account) {
          throw new Error('Wallet not ready. Please disconnect and reconnect your wallet.');
        }

        // Create MetaMask smart account using Delegation Toolkit with timeout protection
        const ACCOUNT_CREATION_TIMEOUT = 120000; // 2 minutes

        const accountPromise = toMetaMaskSmartAccount({
          client: publicClient,
          implementation: Implementation.Hybrid,
          deployParams: [ownerAddress, [], [], []],
          deploySalt: '0x',
          signer: { walletClient },
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(
              'Smart account creation timeout. The wallet may be in a stale state. ' +
              'Please disconnect and reconnect your wallet, then try again.'
            ));
          }, ACCOUNT_CREATION_TIMEOUT);
        });

        const smartAccount = await Promise.race([accountPromise, timeoutPromise]);

        const delegatorAddress = smartAccount.address;

        // CRITICAL FIX: Check if smart account is already deployed on-chain
        // toMetaMaskSmartAccount() returns a deterministic address (counterfactual)
        // but does NOT deploy the contract. We must deploy it explicitly.
        console.log('🔍 Checking if smart account is deployed at:', delegatorAddress);
        const code = await publicClient.getBytecode({ address: delegatorAddress });
        const isDeployed = code !== undefined && code !== '0x';

        if (!isDeployed) {
          // Deploy the smart account on-chain using factory pattern
          // Per MetaMask docs: https://docs.metamask.io/delegation-toolkit/guides/smart-accounts/deploy-smart-account/
          console.log('🚀 Deploying smart account to blockchain...');
          console.log('   This will prompt you to sign a deployment transaction.');

          try {
            // Get factory deployment parameters
            // factory = SimpleFactory contract address
            // factoryData = encoded deployment calldata
            const { factory, factoryData } = await smartAccount.getFactoryArgs();

            console.log('   Factory:', factory);
            console.log('   Deploying to:', delegatorAddress);

            // Send deployment transaction to factory
            const deployTx = await walletClient.sendTransaction({
              to: factory,
              data: factoryData,
            });

            console.log('📤 Deployment transaction sent:', deployTx);

            // Wait for deployment confirmation
            console.log('⏳ Waiting for deployment confirmation...');
            const receipt = await publicClient.waitForTransactionReceipt({
              hash: deployTx,
            });

            if (receipt.status !== 'success') {
              throw new Error('Smart account deployment transaction failed');
            }

            console.log('✅ Smart account successfully deployed!');
            console.log('   Address:', delegatorAddress);
            console.log('   Transaction:', deployTx);
          } catch (deployError: any) {
            console.error('❌ Deployment failed:', deployError);

            // Check if user rejected the transaction
            if (deployError.code === 4001 || deployError.message?.includes('User rejected')) {
              throw new Error('Deployment cancelled: You must sign the deployment transaction to create your smart account');
            }

            throw new Error(`Failed to deploy smart account: ${deployError.message || 'Unknown error'}`);
          }
        } else {
          console.log('✅ Smart account already deployed at:', delegatorAddress);
        }

        // Cache DeleGator address in localStorage
        const storageKey = `delegator_${ownerAddress.toLowerCase()}`;
        localStorage.setItem(storageKey, delegatorAddress);

        // Update status with new DeleGator
        setStatus({
          hasDeleGator: true,
          delegatorAddress,
          isLoading: false,
          error: null,
        });

        return delegatorAddress;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to create DeleGator';
        setStatus(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        throw new Error(errorMessage);
      }
    },
    [publicClient, walletClient]
  );

  /**
   * Get token balance for an address
   */
  const getTokenBalance = useCallback(
    async (
      tokenAddress: Address,
      holderAddress: Address,
      decimals: number = 18
    ): Promise<bigint> => {
      if (!publicClient) return 0n;

      try {
        // Handle native token
        if (
          tokenAddress === '0x0000000000000000000000000000000000000000' ||
          tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
        ) {
          return await publicClient.getBalance({ address: holderAddress });
        }

        // ERC-20 token
        const balance = await publicClient.readContract({
          address: tokenAddress,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }],
            },
          ],
          functionName: 'balanceOf',
          args: [holderAddress],
        });

        return balance as bigint;
      } catch (error) {
        console.error(`Failed to get balance for ${tokenAddress}:`, error);
        return 0n;
      }
    },
    [publicClient]
  );

  /**
   * Get all balances for a DeleGator
   */
  const getDeleGatorBalances = useCallback(
    async (
      delegatorAddress: Address,
      tokenAddresses: { address: Address; symbol: string; decimals: number }[]
    ): Promise<DeleGatorBalances> => {
      if (!publicClient) {
        return { native: 0n, tokens: [], totalValueUSD: 0 };
      }

      try {
        // Get native balance
        const native = await publicClient.getBalance({ address: delegatorAddress });

        // Get token balances
        const tokens: TokenBalance[] = await Promise.all(
          tokenAddresses.map(async token => {
            const balance = await getTokenBalance(
              token.address,
              delegatorAddress,
              token.decimals
            );

            return {
              address: token.address,
              symbol: token.symbol,
              balance,
              decimals: token.decimals,
              formatted: formatUnits(balance, token.decimals),
            };
          })
        );

        // TODO: Calculate USD value using price oracle
        const totalValueUSD = 0;

        return { native, tokens, totalValueUSD };
      } catch (error) {
        console.error('Failed to get DeleGator balances:', error);
        return { native: 0n, tokens: [], totalValueUSD: 0 };
      }
    },
    [publicClient, getTokenBalance]
  );

  /**
   * Transfer native token to DeleGator
   */
  const transferToDeleGator = useCallback(
    async (delegatorAddress: Address, amount: bigint): Promise<`0x${string}`> => {
      if (!walletClient) {
        throw new Error('Wallet not connected');
      }

      try {
        const hash = await walletClient.sendTransaction({
          to: delegatorAddress,
          value: amount,
        });

        return hash;
      } catch (error: any) {
        console.error('Failed to transfer to DeleGator:', error);
        throw new Error(error.message || 'Transfer failed');
      }
    },
    [walletClient]
  );

  /**
   * Transfer ERC-20 token to DeleGator
   */
  const transferTokenToDeleGator = useCallback(
    async (
      tokenAddress: Address,
      delegatorAddress: Address,
      amount: bigint
    ): Promise<`0x${string}`> => {
      if (!walletClient) {
        throw new Error('Wallet not connected');
      }

      try {
        const hash = await walletClient.writeContract({
          address: tokenAddress,
          abi: [
            {
              name: 'transfer',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint256' },
              ],
              outputs: [{ name: '', type: 'bool' }],
            },
          ],
          functionName: 'transfer',
          args: [delegatorAddress, amount],
        });

        return hash;
      } catch (error: any) {
        console.error('Failed to transfer token to DeleGator:', error);
        throw new Error(error.message || 'Token transfer failed');
      }
    },
    [walletClient]
  );

  return {
    // Status
    status,

    // Check operations
    checkDeleGatorStatus,
    isSmartContract,

    // Create operations
    createDeleGator,

    // Balance operations
    getTokenBalance,
    getDeleGatorBalances,

    // Transfer operations
    transferToDeleGator,
    transferTokenToDeleGator,
  };
}
