# Documentation Index

Quick reference to all backend documentation.

## 📚 Core Documentation

| Document | Description | Location |
|----------|-------------|----------|
| **Backend README** | Documentation overview & getting started | `docs/README.md` |
| **Troubleshooting Guide** | Solutions to common issues | `docs/TROUBLESHOOTING.md` |
| **Oracle Setup** | PythOracle configuration guide | `ORACLE_SETUP.md` |
| **E2E Test Guide** | End-to-end testing instructions | `E2E-TEST-SUMMARY.md` |

## 🔧 Technical Guides

| Document | Description | Location |
|----------|-------------|----------|
| **Bot Implementation** | Bot service architecture | `docs/BOT_IMPLEMENTATION_ANALYSIS.md` |
| **Deployed Contracts** | Contract addresses by chain | `docs/DEPLOYED_CONTRACTS.md` |
| **MetaMask Migration** | DeleGator integration guide | `docs/METAMASK_MIGRATION_BACKEND.md` |
| **Implementation Status** | Feature completion tracking | `docs/IMPLEMENTATION_COMPLETE.md` |

## 🛠️ Tools & Scripts

| Tool | Purpose | Command |
|------|---------|---------|
| **Oracle Verification** | Verify Oracle configuration | `./scripts/verify-oracle-config.sh monad` |
| **Database Migration** | Update database schema | `npx prisma migrate dev` |
| **Prisma Studio** | Database GUI | `npx prisma studio` |

## 🐛 Issue Resolutions

| Date | Issue | Summary | Document |
|------|-------|---------|----------|
| 2025-10-17 | Debug Mode Gas Exhaustion | Pyth Oracle not configured | `FIX_SUMMARY_2025-10-17.md` |

## 🚀 Quick Start

1. **Setup Environment**: See [Backend README](docs/README.md#getting-started)
2. **Configure Oracle**: See [Oracle Setup](ORACLE_SETUP.md)
3. **Run E2E Tests**: See [E2E Guide](E2E-TEST-SUMMARY.md)
4. **Troubleshoot Issues**: See [Troubleshooting](docs/TROUBLESHOOTING.md)

## 📖 By Use Case

### I want to...

#### Deploy to New Chain
1. Deploy contracts
2. Follow [Oracle Setup Guide](ORACLE_SETUP.md)
3. Run verification: `./scripts/verify-oracle-config.sh <chain>`
4. Update `.env` with addresses
5. Run E2E tests

#### Debug Transaction Failures
1. Check [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
2. Run Oracle verification
3. Review contract addresses in `.env`
4. Check logs with `DEBUG_REBALANCE=true`

#### Understand Bot Architecture
1. Read [Bot Implementation](docs/BOT_IMPLEMENTATION_ANALYSIS.md)
2. Review [Backend README](docs/README.md#architecture-overview)
3. Check service code in `apps/bot/src/`

#### Test Locally
1. Follow [E2E Test Guide](E2E-TEST-SUMMARY.md)
2. Ensure services running (PostgreSQL, Redis)
3. Run: `npm run start:dev`

## 🔗 External Resources

- **Pyth Network**: https://docs.pyth.network/
- **MetaMask Delegation**: https://docs.metamask.io/delegation-toolkit/
- **NestJS**: https://docs.nestjs.com/
- **Prisma**: https://www.prisma.io/docs/

## 📝 Documentation Maintenance

### Adding New Documentation
1. Create document in appropriate directory
2. Update this index
3. Link from relevant existing docs
4. Add to git: `git add <file>`

### Updating Existing Documentation
1. Modify document
2. Update "Last Updated" date
3. Update version if major changes
4. Commit with descriptive message

---

**Last Updated**: 2025-10-17
**Maintainer**: Development Team
