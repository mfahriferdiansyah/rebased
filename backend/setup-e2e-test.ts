/**
 * E2E Test Setup Script
 * Creates all necessary database records for testing the rebalancing flow
 *
 * Usage: npx tsx setup-e2e-test.ts
 */

import { createPublicClient, http, formatEther, parseEther } from 'viem';
import { PrismaClient } from '@prisma/client';

// Configuration
const TEST_USER_ADDRESS = '0x47B245f2A3c7557d855E4d800890C4a524a42Cc8';
const BOT_ADDRESS = '0x9Dc7CBd56951433c5E0d276ac488D9fAbE862558';

// Monad Testnet
const MONAD_RPC = 'https://testnet-rpc.monad.xyz';
const CHAIN_ID = 10143;

// Token addresses
const MON = '0x0000000000000000000000000000000000000000'; // Native token
const USDC = '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== E2E TEST SETUP ===\n');

  // Setup public client
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

  // 1. Check balances
  console.log('--- INITIAL BALANCES ---');
  const monBalance = await publicClient.getBalance({ address: TEST_USER_ADDRESS as `0x${string}` });
  const usdcBalance = await publicClient.readContract({
    address: USDC as `0x${string}`,
    abi: [{
      inputs: [{ name: 'account', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    }] as const,
    functionName: 'balanceOf',
    args: [TEST_USER_ADDRESS as `0x${string}`],
    authorizationList: undefined,
  } as any);

  console.log(`MON: ${formatEther(monBalance)} MON`);
  console.log(`USDC: ${Number(usdcBalance) / 1e6} USDC`);

  // Calculate current weights
  const monValue = Number(formatEther(monBalance));
  const usdcValue = Number(usdcBalance) / 1e6;
  const totalValue = monValue + usdcValue; // Simplified 1:1 pricing
  const monWeight = (monValue / totalValue) * 100;
  const usdcWeight = (usdcValue / totalValue) * 100;

  console.log(`\nCurrent allocation:`);
  console.log(`  MON: ${monWeight.toFixed(2)}%`);
  console.log(`  USDC: ${usdcWeight.toFixed(2)}%`);

  const drift = Math.max(Math.abs(monWeight - 50), Math.abs(usdcWeight - 50));
  console.log(`  Drift from 50/50: ${drift.toFixed(2)}%`);

  // 2. Ensure user exists
  console.log('\n--- USER SETUP ---');
  let user = await prisma.user.findUnique({
    where: { address: TEST_USER_ADDRESS },
  });

  if (!user) {
    console.log('User not found - should have been created by previous script');
    return;
  }
  console.log('✓ User exists');

  // 3. Create or update strategy
  console.log('\n--- STRATEGY SETUP ---');

  const strategyLogic = JSON.stringify({
    type: 'weighted_portfolio',
    tokens: [
      { address: MON, symbol: 'MON', weight: 5000 },
      { address: USDC, symbol: 'USDC', weight: 5000 },
    ],
    driftThreshold: 500, // 5%
    rebalanceInterval: 3600, // 1 hour
  });

  // Delete existing strategy if any
  await prisma.strategy.deleteMany({
    where: {
      userAddress: TEST_USER_ADDRESS,
      chainId: CHAIN_ID,
    },
  });

  const strategy = await prisma.strategy.create({
    data: {
      userAddress: TEST_USER_ADDRESS,
      strategyId: 1n,
      chainId: CHAIN_ID,
      strategyLogic,
      name: '50/50 MON/USDC Test Strategy',
      tokens: [MON, USDC],
      weights: [5000, 5000], // 50/50
      rebalanceInterval: 3600n, // 1 hour
      isActive: true,
    },
  });

  console.log(`✓ Strategy created (ID: ${strategy.id})`);
  console.log(`  Target: 50% MON / 50% USDC`);
  console.log(`  Drift threshold: 5%`);
  console.log(`  Rebalance interval: 1 hour`);

  // 4. Create delegation
  console.log('\n--- DELEGATION SETUP ---');

  // Delete existing delegations
  await prisma.delegation.deleteMany({
    where: {
      userAddress: TEST_USER_ADDRESS,
    },
  });

  const delegation = await prisma.delegation.create({
    data: {
      userAddress: TEST_USER_ADDRESS,
      delegateAddress: BOT_ADDRESS,
      chainId: CHAIN_ID,
      delegationData: {
        delegate: BOT_ADDRESS,
        delegator: TEST_USER_ADDRESS,
        authority: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // ROOT_AUTHORITY
        caveats: [],
        salt: 0,
      },
      signature: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log(`✓ Delegation created (ID: ${delegation.id})`);
  console.log(`  Delegate (bot): ${BOT_ADDRESS}`);
  console.log(`  Delegator: ${TEST_USER_ADDRESS}`);

  // 5. Link delegation to strategy
  await prisma.strategy.update({
    where: { id: strategy.id },
    data: {
      delegations: {
        connect: { id: delegation.id },
      },
    },
  });

  console.log('✓ Delegation linked to strategy');

  // 6. Summary
  console.log('\n=== SETUP COMPLETE ===\n');
  console.log('Test Configuration:');
  console.log(`  User: ${TEST_USER_ADDRESS}`);
  console.log(`  Bot: ${BOT_ADDRESS}`);
  console.log(`  Chain: Monad Testnet (${CHAIN_ID})`);
  console.log(`  Strategy ID: ${strategy.strategyId}`);
  console.log(`  Delegation active: ${delegation.isActive}`);

  console.log('\nPortfolio Status:');
  console.log(`  Current: ${monWeight.toFixed(1)}% MON / ${usdcWeight.toFixed(1)}% USDC`);
  console.log(`  Target: 50% MON / 50% USDC`);
  console.log(`  Drift: ${drift.toFixed(2)}%`);
  console.log(`  Threshold: 5%`);
  console.log(`  ${drift > 5 ? '✓ REBALANCE NEEDED' : '⚠ Drift below threshold'}`);

  console.log('\n--- NEXT STEPS ---');
  console.log('1. Ensure PostgreSQL and Redis are running');
  console.log('2. Build the backend: npm run build');
  console.log('3. Start backend API: npm run start:dev');
  console.log('4. In another terminal, start the bot: cd apps/bot && npm run start:dev');
  console.log('5. Bot will monitor and execute rebalance automatically');
  console.log('\nOr test manually:');
  console.log('6. Run manual test: npx tsx test-manual-rebalance.ts');

  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
