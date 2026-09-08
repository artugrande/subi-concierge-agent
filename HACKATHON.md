# SUBI Concierge Agent - Celo Agents at Work Hackathon

## Hackathon Entry Information

- **Hackathon**: Celo Agents at Work (Judges Favorite Category)
- **Project**: SUBI Concierge Agent
- **Description**: Space UBI claim/pledge agent on Celo + Self + MiniPay
- **Attribution Tag**: `celo_ac17e664a585` (from Celo Builders registration)
- **ERC-8004 Agent ID**: `9822`
- **Agent Wallet**: `0x35422f585e1f570515147E557aEF8fD6a6e1b3b3`

## Critical: Celo Attribution Tags

**Every transaction on Celo mainnet MUST include the attribution tag to receive hackathon credit.**

Missing the attribution tag on a transaction means that transaction will **permanently lose credit**. There is no backfill mechanism.

### How It Works

This project uses `@celo/attribution-tags` to append the attribution tag to all outbound transactions:

1. **Configuration** (`config.ts`): Attribution tag and agent ID are stored
2. **Utility** (`utils/attribution.ts`): Helper functions to append tags to transaction data
3. **Deploy Scripts** (`scripts/deploy.ts`): All deployments include attribution
4. **Agent Transactions** (`agent/transactions.ts`): All transaction builders include attribution

### Verification

After deploying or sending your first transaction with the attribution tag, verify it:

```bash
npx @celo/attribution-tags verifyTx <TRANSACTION_HASH> --network celo
```

This will confirm that the attribution tag was correctly included in the transaction.

### Implementation Details

The `toDataSuffix` function from `@celo/attribution-tags` appends the tag to the transaction's `data` field:

```typescript
import { toDataSuffix } from "@celo/attribution-tags";

// For any transaction data (contract call, deployment, or simple transfer)
const suffix = toDataSuffix("celo_ac17e664a585");
const dataWithAttribution = originalData + suffix;
```

**Key points:**
- Works for contract deployments (creation transactions)
- Works for contract calls (function calls)
- Works for simple transfers (empty data becomes `0x` + suffix)
- The tag must be appended to EVERY transaction

## Deployment Instructions

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Set up your `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Add your deployer private key to `.env`:
```
DEPLOYER_PRIVATE_KEY=your_private_key_here
```

⚠️ **NEVER commit your `.env` file or private keys to the repository!**

### Deploy to Alfajores Testnet

```bash
npm run deploy:alfajores
```

### Deploy to Celo Mainnet

```bash
npm run deploy:celo
```

### Verify First Transaction

After your first mainnet deployment, verify the attribution tag was included:

```bash
npx @celo/attribution-tags verifyTx <TX_HASH> --network celo
```

## Agent Usage

Run the agent (currently in example mode):

```bash
npm run agent:start
```

The agent demonstrates building various transaction types:
- UBI claims
- UBI pledges
- Simple transfers

All transactions are built with the attribution tag pre-included.

## Project Structure

```
subi-concierge-agent/
├── agent/
│   ├── index.ts           # Main agent logic
│   └── transactions.ts    # Transaction builders (all with attribution)
├── contracts/
│   └── SUBIConcierge.sol  # Smart contract
├── scripts/
│   └── deploy.ts          # Deployment script (with attribution)
├── utils/
│   └── attribution.ts     # Attribution tag helpers
├── config.ts              # Agent configuration (tag, ID, wallet)
├── hardhat.config.ts      # Hardhat configuration
└── package.json           # Dependencies including @celo/attribution-tags
```

## Important Notes

1. **Attribution is mandatory**: Every transaction must include the tag
2. **No backfill**: Missing tags cannot be retroactively added
3. **Verify early**: Use `verifyTx` on your first mainnet transaction
4. **Keep keys secure**: Never commit private keys or seed phrases
5. **Test on Alfajores**: Test your deployment on testnet first

## Resources

- [Celo Attribution Tags Documentation](https://github.com/celo-org/attribution-tags)
- [Celo Agents at Work Hackathon](https://celo.org/hackathons)
- [Celo Documentation](https://docs.celo.org)
