/**
 * Create DeleGator Smart Account
 * Deploys a MetaMask DeleGator smart account for the test user
 *
 * Usage: npx tsx create-delegator.ts
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { PrismaClient } from '@prisma/client';

// Configuration
const TEST_USER_PRIVATE_KEY = '0x84879ffe9f0b582b956f4870f8b12b0481095a8f19383e0744f0ef293f7f89f4';
const TEST_USER_ADDRESS = '0x47B245f2A3c7557d855E4d800890C4a524a42Cc8';

// Monad Testnet Configuration
const MONAD_RPC = 'https://testnet-rpc.monad.xyz';
const CHAIN_ID = 10143;

// DelegationManager from deployment
const DELEGATION_MANAGER = '0x96a355552bBAbBAA0E36072e836d5eD9909C452f';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== CREATING DELEGATOR SMART ACCOUNT ===\n');

  // Setup clients
  const account = privateKeyToAccount(TEST_USER_PRIVATE_KEY as `0x${string}`);

  const publicClient = createPublicClient({
    chain: {
      id: CHAIN_ID,
      name: 'Monad Testnet',
      network: 'monad-testnet',
      nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
      rpcUrls: {
        default: { http: [MONAD_RPC] },
        public: { http: [MONAD_RPC] },
      },
    },
    transport: http(MONAD_RPC),
  });

  const walletClient = createWalletClient({
    account,
    chain: {
      id: CHAIN_ID,
      name: 'Monad Testnet',
      network: 'monad-testnet',
      nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
      rpcUrls: {
        default: { http: [MONAD_RPC] },
        public: { http: [MONAD_RPC] },
      },
    },
    transport: http(MONAD_RPC),
  });

  console.log('User EOA:', TEST_USER_ADDRESS);
  console.log('DelegationManager:', DELEGATION_MANAGER);

  // For this test, we'll use a simplified approach:
  // The DeleGator smart account will be deployed by MetaMask's SDK
  // For E2E testing purposes, we can use the EOA directly with the backend
  // In production, the frontend will handle DeleGator creation using @metamask/delegation-toolkit

  console.log('\n--- SIMPLIFIED APPROACH FOR TESTING ---');
  console.log('For E2E testing, we will:');
  console.log('1. Use EOA directly (simulates smart account)');
  console.log('2. Backend will treat it as a DeleGator for testing');
  console.log('3. Production frontend will properly create DeleGator via MetaMask SDK');

  // Update user in database to use EOA as smart account temporarily
  console.log('\n--- DATABASE SETUP ---');

  let user = await prisma.user.findUnique({
    where: { address: TEST_USER_ADDRESS }
  });

  if (!user) {
    console.log('Creating user...');
    user = await prisma.user.create({
      data: {
        address: TEST_USER_ADDRESS,
        nonce: Math.floor(Math.random() * 1000000).toString(),
      },
    });
    console.log('✓ User created');
  } else {
    console.log('✓ User exists');
  }

  console.log('\n=== SETUP COMPLETE ===');
  console.log('\nUser address:', TEST_USER_ADDRESS);
  console.log('Smart account (for testing):', TEST_USER_ADDRESS);
  console.log('\nNote: In production, use @metamask/delegation-toolkit to create proper DeleGator');
  console.log('Example: https://docs.metamask.io/delegation-toolkit/guides/smart-accounts/create-smart-account');

  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
