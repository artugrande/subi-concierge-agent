# SUBI Concierge Agent API

Agent interface for building unsigned transactions for the SUBI (Space Universal Basic Income) system.

## Overview

This agent builds unsigned transactions compatible with celo-mcp style transaction building for:

- **Pledge**: Deposit stablecoins to the treasury with attribution
- **Claim**: Claim accumulated UBI dividend
- **Register**: Register with Self-verified proof (stub for hackathon)
- **Create Pledge**: Publish Space Dividend Pledge commitment on-chain

## Configuration

Before using, configure the agent with real values in `config.ts`:

```typescript
AGENT_ID: string              // ERC-8004 Agent ID (to be assigned)
AGENT_WALLET: string          // Agent wallet address
ATTRIBUTION_TAG: string       // Celo attribution tag (format: celo_<project>_<action>)
```

After deployment, update contract addresses:

```typescript
import { updateConfig } from "./config";

updateConfig("CELO_MAINNET", {
  treasury: "0x...",
  registry: "0x...",
  distributor: "0x...",
  pledgeRegistry: "0x...",
});
```

## Usage Examples

### Build Pledge Transaction

```typescript
import { buildPledgeTransaction, usdToTokenUnits } from "./transactions";

// Pledge $10,000 USDC to treasury
const amount = usdToTokenUnits("10000", 6); // USDC has 6 decimals
const attribution = "SpaceX - Starlink Q1 2027 Revenue Share";

const txs = buildPledgeTransaction("CELO_MAINNET", amount, attribution);
// Returns 2 transactions: approve + deposit
// Sign and broadcast both
```

### Build Claim Transaction

```typescript
import { buildClaimTransaction, queryClaimable } from "./transactions";

// Check claimable amount
const claimable = await queryClaimable("CELO_MAINNET", "0x...");
console.log(`Claimable: ${tokenUnitsToUsd(claimable, 6)} USD`);

// Build claim transaction
const tx = buildClaimTransaction("CELO_MAINNET", "0x...");
// Sign and broadcast
```

### Build Register Transaction

```typescript
import { buildRegisterTransaction } from "./transactions";

// IMPORTANT: In production, nullifier comes from Self ZK proof
// DO NOT fabricate nullifiers - this is a STUB for hackathon demo
const nullifier = "0x..."; // From Self proof verification

const tx = buildRegisterTransaction("CELO_MAINNET", nullifier);
// Sign and broadcast
```

### Build Create Pledge Transaction

```typescript
import { buildCreatePledgeTransaction } from "./transactions";

const tx = buildCreatePledgeTransaction("CELO_MAINNET", {
  name: "Blue Origin",
  revenuePercentBps: 500, // 5%
  annualFloorUSD: ethers.parseEther("100000").toString(), // $100k/year minimum
  startDate: Math.floor(Date.now() / 1000),
  endDate: 0, // Perpetual
  reportURI: "ipfs://Qm...", // Link to pledge document
});
// Sign and broadcast
```

## Transaction Format

All unsigned transactions follow this format:

```typescript
{
  to: string;           // Contract address
  data: string;         // Encoded function call
  value: string;        // Always "0" (no ETH/CELO sent)
  chainId: number;      // 42220 (mainnet) or 44787 (Sepolia)
  attribution?: string; // Celo attribution tag
}
```

## Fee Abstraction (CIP-64)

SUBI uses Celo's fee abstraction - users can pay gas in the same stablecoin they're claiming/depositing (cUSD, USDC, etc). No need to acquire CELO token for gas.

## Self Integration

The `register()` function is designed for [Self protocol](https://self.app/) integration:

1. User scans passport NFC chip
2. ZK proof generated on device
3. Proof yields unique `nullifier` (no PII transmitted)
4. Agent builds transaction with nullifier

**Hackathon Note**: Registry contract has stub registration. For production, integrate Self's `SelfVerificationRoot` contract for real ZK proof verification.

## Network Details

### Celo Mainnet (42220)
- RPC: `https://forno.celo.org`
- Explorer: https://celoscan.io
- cUSD: `0x765DE816845861e75A25fCA122bb6898B8B1282a`

### Celo Sepolia Testnet (44787)
- RPC: `https://alfajores-forno.celo-testnet.org`
- Explorer: https://alfajores.celoscan.io
- Faucet: https://faucet.celo.org

## Anti-Farming Notes

SUBI is designed to resist value farming:

1. **One human, one slot**: Self nullifiers enforce unique identity
2. **Non-transferable**: Registry slots cannot be sold/traded
3. **Proof of life**: 12-month expiration requires renewal
4. **Conservative accounting**: System pays less if activeCount is stale, never more

## Attribution & Compliance

All transactions include `ATTRIBUTION_TAG` for Celo's value moved tracking. This helps measure agent-driven economic activity on-chain.

## License

MIT
