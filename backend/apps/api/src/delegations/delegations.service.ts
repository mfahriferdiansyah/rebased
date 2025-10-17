import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { ChainService } from '@app/blockchain';
import { ConfigService } from '@nestjs/config';
import { CreateDelegationDto } from './dto/delegation.dto';
import { verifyTypedData } from 'viem';
import { randomBytes } from 'crypto';

@Injectable()
export class DelegationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
    private readonly config: ConfigService,
  ) {}

  /**
   * EIP-712 domain for delegation signatures (MetaMask v1.3.0 compatible)
   */
  private getDomain(chainId: number) {
    // Map chainId to chain name: 10143 = Monad Testnet, 10200 = Monad Mainnet
    const MONAD_CHAIN_IDS = [10200, 10143];
    const chainName = MONAD_CHAIN_IDS.includes(chainId) ? 'monad' : 'base';
    const delegationManagerAddress = this.config.get(
      `blockchain.${chainName}.contracts.delegationManager`,
    );

    return {
      name: 'DelegationManager',
      version: '1', // MUST match DelegationManager.sol DOMAIN_VERSION (not VERSION)
      chainId: BigInt(chainId),
      verifyingContract: delegationManagerAddress as `0x${string}`,
    };
  }

  /**
   * EIP-712 types for delegation (MetaMask Delegation Framework v1.3.0)
   * NOTE: MetaMask v1.3.0 does NOT include a 'deadline' field in the Delegation struct
   */
  private getDelegationTypes() {
    return {
      Delegation: [
        { name: 'delegate', type: 'address' },
        { name: 'delegator', type: 'address' },
        { name: 'authority', type: 'bytes32' },
        { name: 'caveats', type: 'Caveat[]' },
        { name: 'salt', type: 'uint256' },
      ],
      Caveat: [
        { name: 'enforcer', type: 'address' },
        { name: 'terms', type: 'bytes' },
      ],
    };
  }

  /**
   * Create a new delegation
   */
  async create(userAddress: string | null, dto: CreateDelegationDto) {
    // Recover user address from signature if not provided (auth disabled temporarily)
    let recoveredAddress: string;

    if (!userAddress) {
      const { recoverTypedDataAddress } = await import('viem');
      const domain = this.getDomain(dto.chainId);
      const types = this.getDelegationTypes();

      // DEBUG: Log signature recovery inputs
      console.log('🔍 BACKEND - Signature Recovery Debug:');
      console.log('  chainId:', dto.chainId);
      console.log('  signature:', dto.signature);
      console.log('  delegationData:', JSON.stringify(dto.delegationData, null, 2));
      console.log('  domain:', JSON.stringify(domain, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      , 2));
      console.log('  types:', JSON.stringify(types, null, 2));

      try {
        recoveredAddress = await recoverTypedDataAddress({
          domain,
          types,
          primaryType: 'Delegation',
          message: dto.delegationData,
          signature: dto.signature as `0x${string}`,
        });

        console.log('✅ BACKEND - Recovered address:', recoveredAddress);
      } catch (error) {
        console.error('❌ BACKEND - Recovery failed:', error);
        throw new BadRequestException(`Failed to recover address from signature: ${error.message}`);
      }
    } else {
      recoveredAddress = userAddress;
    }

    // Verify the strategy belongs to the user (if strategyId provided)
    if (dto.strategyId) {
      const strategy = await this.prisma.strategy.findUnique({
        where: { id: dto.strategyId },
      });

      if (!strategy) {
        throw new NotFoundException('Strategy not found');
      }

      // New architecture validation:
      // - strategy.userAddress = EOA owner (should match recovered address from signature)
      // - strategy.delegatorAddress = DeleGator smart contract (should match delegation.delegator)

      // Verify EOA ownership
      const isOwner = strategy.userAddress === recoveredAddress.toLowerCase();

      if (!isOwner) {
        throw new ForbiddenException(
          `Strategy ownership mismatch. Strategy is owned by ${strategy.userAddress}, ` +
          `but delegation was signed by ${recoveredAddress}`
        );
      }

      // Verify DeleGator is set - REQUIRED for production architecture
      if (!strategy.delegatorAddress) {
        throw new BadRequestException(
          `Strategy ${strategy.id} does not have a DeleGator smart account configured. ` +
          `Please complete the SmartAccountStep in the wizard first to create/link a DeleGator.`
        );
      }

      // Verify DeleGator match
      const delegatorMatches = strategy.delegatorAddress === dto.delegationData.delegator.toLowerCase();

      if (!delegatorMatches) {
        throw new BadRequestException(
          `DeleGator mismatch. Strategy uses DeleGator ${strategy.delegatorAddress}, ` +
          `but delegation is for ${dto.delegationData.delegator}`
        );
      }

      if (strategy.chainId !== dto.chainId) {
        throw new BadRequestException('Strategy chain ID does not match delegation chain ID');
      }
    }

    // Verify EIP-712 signature
    const domain = this.getDomain(dto.chainId);
    const types = this.getDelegationTypes();

    try {
      const isValid = await verifyTypedData({
        address: recoveredAddress as `0x${string}`,
        domain,
        types,
        primaryType: 'Delegation',
        message: dto.delegationData,
        signature: dto.signature as `0x${string}`,
      });

      if (!isValid) {
        throw new BadRequestException('Invalid delegation signature');
      }
    } catch (error) {
      throw new BadRequestException(`Signature verification failed: ${error.message}`);
    }

    // Generate unique ID from delegation hash
    const delegationId = randomBytes(16).toString('hex');

    // Ensure user exists in database (auto-register on first delegation)
    await this.prisma.user.upsert({
      where: { address: recoveredAddress.toLowerCase() },
      update: {}, // No updates if user exists
      create: {
        address: recoveredAddress.toLowerCase(),
        // nonce auto-generated by Prisma default(uuid())
      },
    });

    // Save to database
    const delegation = await this.prisma.delegation.create({
      data: {
        id: delegationId,
        chainId: dto.chainId,
        strategyId: dto.strategyId,
        userAddress: recoveredAddress.toLowerCase(),
        delegateAddress: dto.delegateAddress.toLowerCase(),
        delegationData: dto.delegationData,
        signature: dto.signature,
        isActive: true,
      },
    });

    return this.formatDelegation(delegation);
  }

  /**
   * Get all delegations for a user
   */
  async findAll(userAddress: string, chainId?: number, isActive?: boolean) {
    const where: any = {
      userAddress: userAddress.toLowerCase(),
    };

    if (chainId) {
      where.chainId = chainId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const delegations = await this.prisma.delegation.findMany({
      where,
      include: {
        strategy: {
          select: {
            id: true,
            strategyId: true,
            tokens: true,
            weights: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return delegations.map((d) => this.formatDelegation(d));
  }

  /**
   * Get a single delegation
   */
  async findOne(id: string, userAddress: string) {
    const delegation = await this.prisma.delegation.findUnique({
      where: { id },
      include: {
        strategy: true,
      },
    });

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    if (delegation.userAddress !== userAddress.toLowerCase()) {
      throw new ForbiddenException('You do not own this delegation');
    }

    return this.formatDelegation(delegation);
  }

  /**
   * Revoke a delegation (marks as inactive in database)
   * @dev On-chain revocation must be done by user via frontend calling DelegationManager.disableDelegation()
   */
  async revoke(id: string, userAddress: string) {
    // Verify ownership
    const delegation = await this.findOne(id, userAddress);

    // Mark as inactive in database
    await this.prisma.delegation.update({
      where: { id },
      data: { isActive: false },
    });

    // Return delegation data for on-chain revocation
    // Frontend will call DelegationManager.disableDelegation() with this data
    return {
      success: true,
      message: 'Delegation marked as inactive in database',
      onChainRevocationRequired: true,
      delegationData: {
        delegate: delegation.delegationData.delegate,
        delegator: delegation.delegationData.delegator || userAddress,
        authority: delegation.delegationData.authority || '0x0000000000000000000000000000000000000000000000000000000000000000',
        caveats: delegation.delegationData.caveats || [],
        salt: delegation.delegationData.salt,
        deadline: delegation.delegationData.deadline || 0,
      },
      contractAddress: this.config.get(
        `blockchain.${delegation.chainId === 84532 ? 'base' : 'monad'}.contracts.delegationManager`,
      ),
      chainId: delegation.chainId,
    };
  }

  /**
   * Link delegation to a strategy
   */
  async linkToStrategy(
    delegationId: string,
    strategyId: string,
    userAddress: string,
  ) {
    // 1. Verify delegation ownership
    const delegation = await this.findOne(delegationId, userAddress);

    // 2. Verify strategy exists and ownership
    const strategy = await this.prisma.strategy.findUnique({
      where: { id: strategyId },
    });

    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    if (strategy.userAddress !== userAddress.toLowerCase()) {
      throw new ForbiddenException('You do not own this strategy');
    }

    // 3. Verify same chainId
    if (delegation.chainId !== strategy.chainId) {
      throw new BadRequestException(
        'Delegation and strategy must be on the same chain',
      );
    }

    // 4. Link delegation to strategy
    const updated = await this.prisma.delegation.update({
      where: { id: delegationId },
      data: { strategyId },
    });

    return this.formatDelegation(updated);
  }

  /**
   * Get delegation statistics for a user
   */
  async getStats(userAddress: string) {
    const delegations = await this.prisma.delegation.findMany({
      where: { userAddress: userAddress.toLowerCase() },
    });

    const stats = {
      totalDelegations: delegations.length,
      activeDelegations: delegations.filter((d) => d.isActive).length,
      revokedDelegations: delegations.filter((d) => !d.isActive).length,
      chainBreakdown: {} as Record<number, number>,
    };

    delegations.forEach((d) => {
      stats.chainBreakdown[d.chainId] = (stats.chainBreakdown[d.chainId] || 0) + 1;
    });

    return stats;
  }

  /**
   * Format delegation for API response
   */
  private formatDelegation(delegation: any) {
    return {
      id: delegation.id,
      chainId: delegation.chainId,
      strategyId: delegation.strategyId,
      userAddress: delegation.userAddress,
      delegateAddress: delegation.delegateAddress,
      delegationData: delegation.delegationData,
      signature: delegation.signature,
      isActive: delegation.isActive,
      createdAt: delegation.createdAt,
      updatedAt: delegation.updatedAt,
      strategy: delegation.strategy
        ? {
            id: delegation.strategy.id,
            strategyId: delegation.strategy.strategyId.toString(),
            tokens: delegation.strategy.tokens,
            weights: delegation.strategy.weights,
            isActive: delegation.strategy.isActive,
          }
        : undefined,
    };
  }
}
