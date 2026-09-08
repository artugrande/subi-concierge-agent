# SUBI Concierge Agent

**Space Universal Basic Income** — Hackathon MVP for Celo Agents at Work

> Thin agent for distributing universal basic income funded by space resource revenue, built on Celo with Self-verified identity and MiniPay integration.

## 🎯 Hackathon Submission

- **Track**: Judges' Favorite
- **Author**: Arturo Grande
- **Telegram**: [@artugrande](https://t.me/artugrande)
- **Reference**: [subi.space](https://subi.space)
- **Repository**: https://github.com/artugrande/subi-concierge-agent (PUBLIC)

### Why Judges' Favorite?

SUBI combines four powerful Celo primitives to solve a real institutional problem:

1. **Self-verified Identity** — Zero-knowledge proof from passport NFC. No biometrics, no PII, just cryptographic proof of unique humanity.
2. **No Speculative Token** — Distributes stablecoins (cUSD, USDC, wARS, etc). No token to farm, no liquidity pools to exploit.
3. **Fee Abstraction (CIP-64)** — Pay gas in the stablecoin you receive. A Venezuelan receiving wVES never touches CELO token.
4. **MiniPay Distribution** — 11 million wallets already deployed. No app install required.

**The institutional angle**: Article I of the Outer Space Treaty (1967) says space exploration "shall be carried out for the benefit of all countries" and is "the province of all mankind." That's 140+ countries with ratified obligation to share space benefits, but zero infrastructure to do it. SUBI is the infrastructure.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Smart Contracts](#smart-contracts)
- [Agent API](#agent-api)
- [Web App](#web-app)
- [Testing](#testing)
- [Deployment](#deployment)
- [Anti-Farming Design](#anti-farming-design)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

### What is SUBI?

SUBI (Space Universal Basic Income) implements Article I of the Outer Space Treaty by:

1. **Treasury**: Accepts stablecoin pledges from organizations with space-derived revenue
2. **Registry**: Verifies unique humans using Self ZK proofs (passport NFC)
3. **Distributor**: Pays daily UBI using Alaska Permanent Fund-style perpetual model
4. **Pledge Registry**: Public ledger of voluntary commitments (transparency without legal enforcement)

### The Math

```
Daily Budget = (Treasury × 4% Draw Rate) ÷ 365
Per Capita = Daily Budget ÷ Active Humans
```

**Structurally insolvent-proof**: Distributes a percentage of what exists, not a fixed promise.

**O(1) claim cost**: Accumulated index pattern means claim cost is constant regardless of time elapsed or registry size.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         SUBI System                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌───────────────┐    ┌─────────────┐ │
│  │ SubiRegistry │────▶│SubiDistributor│───▶│ SubiTreasury│ │
│  └──────────────┘     └───────────────┘    └─────────────┘ │
│        │                     │                              │
│        │ isActive()          │ withdraw()                   │
│        │ activeCount()       │                              │
│        │                     │                              │
│  ┌─────▼──────────┐    ┌────▼──────────┐                   │
│  │Self Verification│    │  ERC20 (cUSD)│                   │
│  │  (ZK Proofs)    │    │  USDC / wARS │                   │
│  └─────────────────┘    └──────────────┘                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          PledgeRegistry (Voluntary Commitments)      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Components

1. **SubiRegistry.sol** — Self-verified human registry
   - One human, one slot (nullifier-based)
   - 12-month proof-of-life renewal
   - Rebinding with 30-day cooldown

2. **SubiTreasury.sol** — Custodies stablecoins
   - Accepts deposits from anyone
   - Tracks attribution by contributor
   - Only distributor can withdraw

3. **SubiDistributor.sol** — Perpetual fund distribution
   - 4% annual draw rate (configurable, capped at 10%)
   - Accumulated index for O(1) claims
   - Conservative accounting (never overpays)

4. **PledgeRegistry.sol** — Public commitment ledger
   - Organizations declare % of space revenue
   - Submit quarterly audited reports
   - Immutable transparency, no legal force

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/artugrande/subi-concierge-agent.git
cd subi-concierge-agent

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your values (see Deployment section)
```

### Development

```bash
# Start Next.js dev server
npm run dev
# Open http://localhost:3000

# Compile contracts
npm run compile

# Run tests
npm test
```

---

## Smart Contracts

### Compile

```bash
npm run compile
```

Generates TypeScript types in `typechain-types/`.

### Test

```bash
npm test
```

Runs comprehensive test suite covering:
- Distribution math (daily accrual, perpetual solvency)
- Registry integration (registration, deregistration)
- Treasury deposits and withdrawals
- Edge cases (zero balance, zero humans, stale registry)

### Deploy

#### Celo Sepolia Testnet

```bash
# Get test CELO from faucet: https://faucet.celo.org
npm run deploy:sepolia
```

#### Celo Mainnet

```bash
# Configure .env with PRIVATE_KEY and ASSET_ADDRESS
# ASSET_ADDRESS options:
#   - cUSD: 0x765DE816845861e75A25fCA122bb6898B8B1282a
#   - USDC: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C

npm run deploy:mainnet
```

Deployment script outputs contract addresses for agent configuration.

---

## Agent API

Located in `/agent/` — builds unsigned transactions for pledge, claim, register, and create pledge operations.

### Configuration

Before use, configure placeholders in `agent/config.ts`:

```typescript
AGENT_ID: "PLACEHOLDER_AGENT_ID"           // ERC-8004 Agent ID (to be assigned)
AGENT_WALLET: "PLACEHOLDER_AGENT_WALLET"   // Agent wallet address
ATTRIBUTION_TAG: "PLACEHOLDER_CELO_TAG"    // Format: celo_subi_<action>
```

After deployment, update contract addresses:

```typescript
import { updateConfig } from "./agent/config";

updateConfig("CELO_MAINNET", {
  treasury: "0x...",
  registry: "0x...",
  distributor: "0x...",
  pledgeRegistry: "0x...",
});
```

### Usage Examples

```typescript
import { buildPledgeTransaction, buildClaimTransaction } from "./agent/transactions";

// Build pledge transaction (returns 2 txs: approve + deposit)
const pledgeTxs = buildPledgeTransaction(
  "CELO_MAINNET",
  "10000000", // 10 USDC (6 decimals)
  "SpaceX - Starlink Q1 2027 Revenue"
);

// Build claim transaction
const claimTx = buildClaimTransaction("CELO_MAINNET", userAddress);

// Query claimable amount (read-only)
const claimable = await queryClaimable("CELO_MAINNET", userAddress);
```

See [`agent/README.md`](agent/README.md) for full API documentation.

---

## Web App

Next.js App Router application with MiniPay-optimized UI.

### Features

- **Claim Tab**: Register with Self, check claimable balance, claim dividend
- **Pledge Tab**: Create Space Dividend Pledge commitment
- **Fee Abstraction UI**: Explains CIP-64 gas payment in stablecoins
- **Mobile-First**: Optimized for MiniPay in-app browser

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Test Coverage

- **SubiDistributor.test.ts**: Distribution math, solvency, O(1) claims
- **SubiTreasury.test.ts**: Deposits, attribution, withdrawals, governance

### Key Test Scenarios

1. **Perpetual Solvency**: Verify 4% draw rate never depletes fund
2. **Even Distribution**: Multiple humans receive equal shares
3. **O(1) Claim Cost**: Gas cost constant regardless of elapsed time
4. **Conservative Accounting**: Stale activeCount pays less, never more
5. **Registry Integration**: Registration/deregistration hooks work correctly

---

## Deployment

### Step 1: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
PRIVATE_KEY=0xYourPrivateKeyHere
CELO_MAINNET_RPC=https://forno.celo.org
CELO_SEPOLIA_RPC=https://alfajores-forno.celo-testnet.org

# For mainnet, specify asset address:
ASSET_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a  # cUSD
```

### Step 2: Deploy Contracts

```bash
# Testnet
npm run deploy:sepolia

# Mainnet (ensure ASSET_ADDRESS is set)
npm run deploy:mainnet
```

Deployment outputs contract addresses — save these for agent configuration.

### Step 3: Configure Agent

Update `agent/config.ts` with deployed addresses:

```typescript
CONTRACTS: {
  CELO_MAINNET: {
    treasury: "0xDeployedTreasuryAddress",
    registry: "0xDeployedRegistryAddress",
    distributor: "0xDeployedDistributorAddress",
    pledgeRegistry: "0xDeployedPledgeRegistryAddress",
    asset: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // cUSD
  }
}
```

### Step 4: Fund Treasury (Optional)

For testing, fund the treasury with mock tokens:

```typescript
// Using ethers.js
const treasury = await ethers.getContractAt("SubiTreasury", treasuryAddress);
await asset.approve(treasuryAddress, amount);
await treasury.deposit(amount, "Initial test funding");
```

### Step 5: Verify on Explorer

- **Celo Mainnet**: https://celoscan.io
- **Celo Sepolia**: https://alfajores.celoscan.io

---

## Anti-Farming Design

SUBI is engineered to resist value extraction:

### 1. One Human, One Slot
- **Self Nullifiers**: Cryptographic proof of unique identity
- **Non-Transferable**: Registry slots cannot be bought/sold
- **Scope-Limited**: Nullifiers are app-specific (not correlatable across services)

### 2. Proof-of-Life Expiration
- **12-Month Renewal**: Must prove liveness annually
- **Grace Period**: Can renew even if expired (to avoid slot loss)
- **No Inheritance**: Slots die with the holder

### 3. Conservative Accounting
- **Overestimate Protection**: If `activeCount()` is stale (expired proofs not reaped), system pays LESS per capita, never more
- **Error Margin**: Always rounds down, surplus stays in treasury

### 4. Rebinding Cooldown
- **30-Day Delay**: Lost keys? Wait 30 days to rebind to new address
- **Device Loss Protection**: Prevents instant re-registration attacks

### 5. No Speculative Token
- **Stablecoin Only**: Distributes cUSD/USDC/wARS, not a project token
- **No Liquidity Pools**: Nothing to LP farm or manipulate
- **No Governance Token**: Draw rate capped at 10%, adjustable only by multisig+timelock

---

## Roadmap

### Phase 0: Hackathon MVP ✅
- [x] Core contracts (Registry, Treasury, Distributor, PledgeRegistry)
- [x] Comprehensive tests
- [x] Agent API for unsigned transaction building
- [x] MiniPay-friendly web app
- [x] Documentation

### Phase 1: Self Integration (Q1 2027)
- [ ] Integrate Self `SelfVerificationRoot` contract
- [ ] ZK proof verification on-chain
- [ ] Real nullifier extraction from passport NFC
- [ ] Test with 10 verified humans on Sepolia

### Phase 2: Pilot (Q2 2027)
- [ ] 1,000 verified humans in Argentina
- [ ] $500k treasury funding
- [ ] 12-month duration
- [ ] Academic auditor for impact measurement
- [ ] Target: ~$1.37/day per person (~$41/month)

### Phase 3: UNCOPUOS Presentation (Q3 2027)
- [ ] Present operational mechanism to UN Committee on Peaceful Uses of Outer Space
- [ ] Propose inclusion in Space Resources Working Group final report
- [ ] Demonstrate precedent: voluntary sharing mechanism exists and works

### Phase 4: Regional Scale (2028)
- [ ] Open registry to all Latin America via MiniPay
- [ ] Integrate Ripio wFIAT (wARS, wCLP, wCOP, etc)
- [ ] Target first real Space Dividend Pledge from space company

### Phase 5: Global Scale (2029+)
- [ ] Remove geographic restrictions
- [ ] Support 174+ countries via Self passport support
- [ ] Integrate additional document types beyond passports
- [ ] Community-based attestation for undocumented populations

---

## AskBots Integration Ready

Repository includes clear agent documentation for AskBots:

- **Transaction Building**: `agent/transactions.ts` exports unsigned tx builders
- **Configuration**: `agent/config.ts` with placeholder slots for agent ID/wallet
- **Attribution Tags**: Placeholders for Celo value-moved tracking
- **Documentation**: `agent/README.md` with usage examples

### Integration Checklist

- [ ] Assign ERC-8004 Agent ID
- [ ] Configure `AGENT_WALLET` address
- [ ] Set `ATTRIBUTION_TAG` (format: `celo_subi_claim`, `celo_subi_pledge`)
- [ ] Test transaction building with bot
- [ ] Monitor value moved via attribution tags

---

## Technical Notes

### Self Integration Status

**Current**: Stub implementation in `SubiRegistry.sol` accepts nullifiers directly for demonstration.

**Production TODO**:
1. Inherit from `SelfVerificationRoot` (Self protocol contract)
2. Verify ZK proofs on-chain via `verifySelfProof()`
3. Extract nullifier from proof
4. Validate proof hasn't expired
5. Check age predicate (18+) if required by jurisdiction

**NEVER** fake Self proofs or nullifiers. The stub is clearly labeled for hackathon purposes only.

### CIP-64 Fee Abstraction

Celo's fee abstraction lets users pay gas in the token they're transacting:
- Claiming cUSD? Gas paid in cUSD.
- Claiming wARS (Argentine peso)? Gas paid in wARS.

No need to acquire CELO token. Critical for UBI where recipients may have no capital to buy gas tokens.

**Note**: First-time Self registration may require tiny CELO top-up (~0.001 CELO ≈ $0.0005) if fee abstraction is not yet active for the registry contract. After first mint, all operations use CIP-64. See [`docs/FEE_ABSTRACTION.md`](docs/FEE_ABSTRACTION.md) for details.

**Agent Wallet**: `0x35422f585e1f570515147E557aEF8fD6a6e1b3b3` (funded with ~1.98 USDT, 0 native CELO - demonstrates fee abstraction works)

### Value Moved Tracking

All agent transactions include `attribution` field with format `celo_<project>_<action>`:
- `celo_subi_pledge` — Space company deposits to treasury
- `celo_subi_claim` — Human claims UBI dividend

This enables Celo to track agent-driven economic activity and demonstrate hackathon impact.

---

## FAQ

### Why not use Worldcoin's proof-of-personhood?

Worldcoin requires scanning iris biometrics with proprietary hardware. Self uses passport NFC (government-issued credential) with ZK proofs generated on the user's phone. No biometrics, no PII transmitted, no hardware to distribute.

### Why not use a DAO for governance?

SUBI doesn't need continuous governance — it's a formula, not a decision. The 10% draw rate cap is immutable. Changes to `drawRateBps` within that cap go through multisig+timelock. Prevents attacks and bikeshedding.

### What if someone loses their phone?

Self nullifiers can be rebound to a new address after 30-day cooldown. Unclaimed dividends remain claimable (checkpoint preserved). This is documented in `SubiRegistry.sol`.

### How does this relate to existing UBI projects?

| Project | Identity | Fundamento | Moneda | Token Propio |
|---------|----------|------------|--------|--------------|
| Worldcoin | Iris biométrica | Inversores privados | WLD (volátil) | Sí |
| GoodDollar | Video facial | Filantropía + emisión | G$ (volátil) | Sí |
| Proof of Humanity | Video + aval | Emisión propia | UBI (volátil) | Sí |
| **SUBI** | **Pasaporte ZK** | **Tratado del Espacio 1967** | **Stablecoins** | **No** |

SUBI is the first with:
1. Legal foundation (multilateral treaty)
2. No speculative token
3. Institutional adoption path (states can back it)

---

## Contributing

This is a hackathon MVP and reference implementation. For production use:

1. **Audit Contracts**: Especially `SubiDistributor.sol` arithmetic
2. **Integrate Real Self**: Replace stub with `SelfVerificationRoot`
3. **Multisig+Timelock**: Add governance controls
4. **Gas Optimization**: Batch operations where possible
5. **Frontend Integration**: Connect wallet, sign transactions
6. **MCP Integration**: Full celo-mcp compatibility for agent use

Pull requests welcome after hackathon.

---

## License

MIT License - see LICENSE file.

**Note**: This is open-source reference implementation for a public good. Anyone (organizations, jurisdictions, DAOs) can fork and deploy their own SUBI instance. The mechanism is the innovation, not the deployment.

---

## Contact

- **Author**: Arturo Grande
- **Telegram**: [@artugrande](https://t.me/artugrande)
- **Website**: [subi.space](https://subi.space)
- **Repository**: [github.com/artugrande/subi-concierge-agent](https://github.com/artugrande/subi-concierge-agent)

Built with ❤️ for the Celo Agents at Work Hackathon.

---

## References

- [Outer Space Treaty (1967)](https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html) — UN Office for Outer Space Affairs
- [Alaska Permanent Fund](https://pfd.alaska.gov/) — Dividend model inspiration
- [Self Protocol](https://self.app/) — ZK proof-of-personhood
- [Celo Fee Abstraction (CIP-64)](https://github.com/celo-org/celo-proposals/blob/master/CIPs/cip-0064.md)
- [MiniPay](https://www.opera.com/products/minipay) — Celo wallet distribution
- [GiveDirectly Kenya UBI](https://www.givedirectly.org/ubi-study/) — Impact evidence
- [subi.space](https://subi.space) — Full proposal and simulator
