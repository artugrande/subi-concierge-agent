# SUBI Concierge Agent

Space UBI claim/pledge agent on Celo + Self + MiniPay.

**Celo Agents at Work Hackathon** (Judges Favorite Category)

## Overview

SUBI Concierge Agent is an AI-powered agent that helps users claim and pledge Universal Basic Income (UBI) on the Celo blockchain. This project is built for the Celo Agents at Work hackathon and includes full integration with Celo attribution tags for hackathon credit tracking.

## Features

- 🤖 **AI Agent**: Autonomous UBI claim and pledge management
- 🏷️ **Attribution Tags**: All transactions include Celo attribution tags for hackathon credit
- 💼 **Smart Contracts**: Solidity contracts for UBI management on Celo
- 🔐 **Secure**: Private keys never committed to repository
- 🧪 **Testnet Support**: Deploy and test on Alfajores before mainnet

## Quick Start

### Installation

```bash
npm install
```

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Add your deployer private key to `.env` (for deployment only):
```
DEPLOYER_PRIVATE_KEY=your_private_key_here
```

⚠️ **NEVER commit your `.env` file!**

### Deploy

**Testnet (Alfajores):**
```bash
npm run deploy:alfajores
```

**Mainnet (Celo):**
```bash
npm run deploy:celo
```

### Run Agent

```bash
npm run agent:start
```

## Attribution Tags

**CRITICAL**: Every transaction on Celo mainnet MUST include the attribution tag `celo_ac17e664a585` for hackathon credit. This project automatically includes the tag in all transactions via the `@celo/attribution-tags` package.

### Verify Attribution

After your first mainnet transaction:

```bash
npx @celo/attribution-tags verifyTx <TRANSACTION_HASH> --network celo
```

See [HACKATHON.md](HACKATHON.md) for complete attribution documentation.

## Project Structure

- `agent/` - Agent logic and transaction builders (all with attribution)
- `contracts/` - Solidity smart contracts
- `scripts/` - Deployment scripts (with attribution)
- `utils/` - Attribution tag helpers
- `config.ts` - Agent configuration (tag, ID, wallet)

## Hackathon Details

- **Attribution Tag**: `celo_ac17e664a585`
- **Agent ID**: `9822`
- **Agent Wallet**: `0x35422f585e1f570515147E557aEF8fD6a6e1b3b3`

For full hackathon documentation, see [HACKATHON.md](HACKATHON.md).

## Security

- Private keys are NEVER committed to the repository
- Use environment variables for sensitive configuration
- The `.env` file is gitignored by default

## License

MIT
