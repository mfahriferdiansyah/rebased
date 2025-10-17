/**
 * E2E Test Script for Rebased Platform
 * Tests the full flow: DeleGator creation -> Strategy registration -> Rebalancing
 *
 * Usage: npm run ts-node test-e2e.ts
 */

import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { PrismaClient } from '@prisma/client';

// Configuration
const TEST_USER_PRIVATE_KEY = '0x84879ffe9f0b582b956f4870f8b12b0481095a8f19383e0744f0ef293f7f89f4';
const TEST_USER_ADDRESS = '0x47B245f2A3c7557d855E4d800890C4a524a42Cc8';
const BOT_PRIVATE_KEY = '0xfc5125e9fdc8963c11b341c5d76b9c0aeb90758aa9dbe1e9b8c506581bcaf490';
const BOT_ADDRESS = '0x9Dc7CBd56951433c5E0d276ac488D9fAbE862558';

// Monad Testnet Configuration
const MONAD_RPC = 'https://testnet-rpc.monad.xyz';
const CHAIN_ID = 10143;

// Token addresses
const MON = '0x0000000000000000000000000000000000000000'; // Native token
const USDC = '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea';

// Contract addresses
const STRATEGY_REGISTRY = '0x6655e6ee9a1BcF91047C9c0b1f4bAf56E2cfd146';
const REBALANCE_EXECUTOR = '0xc5bd44d66d3cCe2D534972A749060472e7Ec78c9';
const DELEGATION_MANAGER = '0x96a355552bBAbBAA0E36072e836d5eD9909C452f';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== REBASED E2E TEST ===\n');

  // 1. Setup clients
  const account = privateKeyToAccount(TEST_USER_PRIVATE_KEY as `0x${string}`);
  const botAccount = privateKeyToAccount(BOT_PRIVATE_KEY as `0x${string}`);

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

  // 2. Check balances
  console.log('--- INITIAL BALANCES ---');
  const monBalance = await publicClient.getBalance({ address: TEST_USER_ADDRESS as `0x${string}` });
  const usdcBalance = await publicClient.readContract({
    address: USDC as `0x${string}`,
    abi: [
      {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'balanceOf',
    args: [TEST_USER_ADDRESS as `0x${string}`],
  });

  console.log(`MON: ${formatEther(monBalance)} MON`);
  console.log(`USDC: ${Number(usdcBalance) / 1e6} USDC`);

  // 3. Database setup
  console.log('\n--- DATABASE SETUP ---');

  // Check if user exists
  let user = await prisma.user.findUnique({ where: { address: TEST_USER_ADDRESS } });

  if (!user) {
    console.log('Creating user in database...');
    user = await prisma.user.create({
      data: {
        address: TEST_USER_ADDRESS,
        email: 'test@rebased.app',
        smartAccountAddress: TEST_USER_ADDRESS, // For now, using same address - needs DeleGator in production
      },
    });
    console.log('✓ User created');
  } else {
    console.log('✓ User exists');
  }

  // 4. Create strategy in database
  console.log('\n--- CREATING STRATEGY ---');

  const strategyLogic = {
    type: 'weighted_portfolio',
    config: {
      tokens: [MON, USDC],
      weights: [5000, 5000], // 50/50
      driftThreshold: 500, // 5%
      rebalanceInterval: 3600, // 1 hour
    },
  };

  let strategy = await prisma.strategy.findFirst({
    where: {
      userAddress: TEST_USER_ADDRESS,
      chainId: CHAIN_ID,
    },
  });

  if (!strategy) {
    strategy = await prisma.strategy.create({
      data: {
        userId: user.id,
        userAddress: TEST_USER_ADDRESS,
        strategyId: 1n,
        chainId: CHAIN_ID,
        strategyLogic: JSON.stringify(strategyLogic),
        name: '50/50 MON/USDC Test Strategy',
        isActive: true,
        driftThreshold: 500,
        rebalanceInterval: 3600,
      },
    });
    console.log(`✓ Strategy created with ID: ${strategy.id}`);
  } else {
    console.log(`✓ Strategy exists with ID: ${strategy.id}`);
  }

  // 5. Create delegation
  console.log('\n--- DELEGATION SETUP ---');
  console.log('IMPORTANT: In production, user must sign delegation via frontend');
  console.log('For testing, we\'ll create a delegation record in the database');

  let delegation = await prisma.delegation.findFirst({
    where: {
      userAddress: TEST_USER_ADDRESS,
      isActive: true,
    },
  });

  if (!delegation) {
    delegation = await prisma.delegation.create({
      data: {
        userId: user.id,
        userAddress: TEST_USER_ADDRESS,
        chainId: CHAIN_ID,
        delegationHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        delegationData: {
          delegate: BOT_ADDRESS,
          delegator: TEST_USER_ADDRESS,
          authority: '0x0000000000000000000000000000000000000000000000000000000000000000',
          caveats: [],
          salt: 0,
        },
        signature: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
    console.log('✓ Delegation created');
  } else {
    console.log('✓ Delegation exists');
  }

  // Link delegation to strategy
  await prisma.strategy.update({
    where: { id: strategy.id },
    data: { delegations: { connect: { id: delegation.id } } },
  });

  // 6. Manual rebalance test
  console.log('\n--- TESTING REBALANCE FLOW ---');
  console.log('Strategy details:');
  console.log(`  - Name: ${strategy.name}`);
  console.log(`  - Tokens: MON, USDC`);
  console.log(`  - Target: 50/50`);
  console.log(`  - Drift threshold: 5%`);

  console.log('\nCurrent portfolio:');
  const monValue = Number(formatEther(monBalance));
  const usdcValue = Number(usdcBalance) / 1e6;
  const totalValue = monValue + usdcValue; // Simplified, assumes 1:1 price
  const monWeight = (monValue / totalValue) * 100;
  const usdcWeight = (usdcValue / totalValue) * 100;

  console.log(`  MON: ${monValue.toFixed(2)} (${monWeight.toFixed(2)}%)`);
  console.log(`  USDC: ${usdcValue.toFixed(2)} (${usdcWeight.toFixed(2)}%)`);

  const drift = Math.max(Math.abs(monWeight - 50), Math.abs(usdcWeight - 50));
  console.log(`  Drift: ${drift.toFixed(2)}%`);

  if (drift > 5) {
    console.log('\n✓ Drift exceeds threshold - rebalance should trigger');
  } else {
    console.log('\n⚠ Drift below threshold - rebalance may not trigger');
  }

  console.log('\n=== TEST SETUP COMPLETE ===');
  console.log('\nNext steps:');
  console.log('1. Start PostgreSQL: brew services start postgresql');
  console.log('2. Start Redis: brew services start redis');
  console.log('3. Start backend: cd apps/api && npm run start:dev');
  console.log('4. Start bot: cd apps/bot && npm run start:dev');
  console.log('5. Monitor logs for rebalance execution');
  console.log('\nTest user: ' + TEST_USER_ADDRESS);
  console.log('Bot address: ' + BOT_ADDRESS);

  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
