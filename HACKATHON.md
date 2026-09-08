# Celo Agents at Work Hackathon Submission

## Project: SUBI Concierge Agent

### Submission Details

- **Track**: Judges' Favorite
- **Author**: Arturo Grande
- **Telegram**: @artugrande
- **Repository**: https://github.com/artugrande/subi-concierge-agent (PUBLIC)
- **Reference Site**: https://subi.space

---

## Elevator Pitch (30 seconds)

Article I of the Outer Space Treaty says space exploration is "for the benefit of all countries" — but there's no infrastructure to deliver that benefit to actual humans.

SUBI is that infrastructure: Self-verified identity (passport NFC, no biometrics), stablecoin distribution (no farming token), Celo fee abstraction (gas paid in the currency you receive), MiniPay reach (11M wallets, no app install).

The pitch to space companies isn't "do good" — it's "here's transparent compliance with the treaty your country ratified."

---

## What Makes This "Judges' Favorite"?

### 1. Real Institutional Problem
- 140+ countries ratified Outer Space Treaty with benefit-sharing obligation
- $1.8 trillion space economy projected by 2035 (WEF/McKinsey)
- Zero operational mechanism to comply with Article I
- UNCOPUOS (UN space committee) needs a working example by 2027

### 2. Celo Primitives Working Together
- **Self**: ZK proof from passport NFC (unique humans, no PII)
- **Fee Abstraction (CIP-64)**: Gas paid in cUSD/wARS/USDC — no CELO token friction
- **MiniPay**: 11M wallets deployed, instant distribution channel
- **Mento Stables**: 21 currencies for local purchasing power

### 3. Anti-Farming by Design
- One human, one slot (Self nullifiers)
- No token to speculate on (distributes stablecoins)
- Proof-of-life renewal (12 months)
- Conservative accounting (overpays never, underpays when stale)

### 4. State-Adoptable
Unlike Worldcoin (biometric privacy concerns) or token-based UBI (regulatory red flags), governments can back SUBI:
- Uses government-issued documents (passports)
- No project token
- Voluntary pledges (not coercive)
- Open-source reference implementation

---

## Technical Achievements

### Smart Contracts (Celo-Optimized)

1. **SubiDistributor.sol** — O(1) claim cost
   - Accumulated index pattern: constant gas regardless of time elapsed
   - Perpetual solvency: distributes % of fund, never fixed amount
   - Alaska Permanent Fund draw model (4% annual)

2. **SubiRegistry.sol** — Self integration hooks
   - Nullifier-based uniqueness
   - 12-month proof-of-life
   - Rebinding with cooldown (lost device recovery)

3. **SubiTreasury.sol** — Permissionless deposits
   - Anyone can pledge with attribution
   - Transparent ledger of contributions
   - Only distributor can withdraw

4. **PledgeRegistry.sol** — Voluntary commitment ledger
   - Space companies publish pledges on-chain
   - Quarterly report hashes (auditable)
   - No legal force — transparency is the mechanism

### Agent API (celo-mcp style)

- Unsigned transaction builders for pledge/claim/register
- Attribution tags for value-moved tracking
- Configuration placeholders for ERC-8004 Agent ID
- Read-only queries (claimable balance)

### Web App (MiniPay-Ready)

- Next.js 15 App Router
- Mobile-first UI optimized for MiniPay browser
- Claim and Pledge flows
- Educational content (treaty background, anti-farming design)

### Tests (Comprehensive)

- Distribution math verification
- Perpetual solvency checks
- O(1) gas cost validation
- Registry integration
- Treasury attribution tracking

---

## Agent Integration

### Current State (Hackathon MVP)

```typescript
// agent/config.ts
AGENT_ID: "PLACEHOLDER_AGENT_ID"           // ERC-8004 to be assigned
AGENT_WALLET: "PLACEHOLDER_AGENT_WALLET"   // Agent address
ATTRIBUTION_TAG: "PLACEHOLDER_CELO_TAG"    // Value-moved tracking
```

### Usage

```typescript
import { buildPledgeTransaction, buildClaimTransaction } from "./agent/transactions";

// Build pledge (space company)
const txs = buildPledgeTransaction("CELO_MAINNET", amount, "SpaceX - Starlink");

// Build claim (verified human)
const tx = buildClaimTransaction("CELO_MAINNET", humanAddress);
```

### AskBots Ready

- Clear API documentation in `agent/README.md`
- Unsigned transaction format compatible with celo-mcp
- Placeholder fields for bot configuration
- Attribution tags for tracking

---

## Deployment Plan

### Testnet (Celo Sepolia)
```bash
npm run deploy:sepolia
```

### Mainnet (Post-Hackathon)
1. Audit contracts (especially distributor math)
2. Set up multisig + timelock for governance
3. Integrate real Self protocol
4. Deploy with cUSD treasury
5. Announce at Argentina Space conference (Nov 2026)

---

## Judging Criteria Alignment

### Innovation
- First UBI system with legal foundation (treaty compliance)
- O(1) claim cost via accumulated index pattern
- Conservative accounting (impossible to overpay)

### Technical Execution
- Comprehensive test coverage
- Clean contract architecture
- Agent API ready for integration
- MiniPay-optimized frontend

### Celo Ecosystem Fit
- Uses Self (Celo-native identity)
- Leverages fee abstraction (critical for UBI)
- MiniPay distribution (11M wallets)
- Mento stablecoins (21 currencies)

### Real-World Impact
- Solves institutional problem (treaty compliance)
- Path to state adoption (no biometrics, no token)
- Evidence-backed (Alaska 44 years, GiveDirectly 9 years)
- Presentation target: UNCOPUOS 2027

### Agent-First Design
- Unsigned transaction builders
- Attribution tags
- Clear documentation
- Configuration placeholders

---

## What's NOT Done (Intentional Scope)

### Self Integration
- **Current**: Stub accepts nullifiers directly
- **Production**: Integrate `SelfVerificationRoot`, verify ZK proofs on-chain
- **Reason**: Self protocol integration requires production keys and audited proof verification

### Frontend Wallet Connection
- **Current**: UI mockups with placeholder state
- **Production**: wagmi/viem integration, real wallet signing
- **Reason**: Focus on contracts and agent API for hackathon

### Mainnet Deployment
- **Current**: Deployment scripts ready, not executed
- **Production**: After audit and multisig setup
- **Reason**: Not deploying unaudited contracts to mainnet with real funds

### UNCOPUOS Politics
- **Out of Scope**: UN negotiation, legal ratification
- **In Scope**: Operational precedent (show it works)

---

## Repository Structure

```
subi-concierge-agent/
├── contracts/              # Solidity contracts
│   ├── SubiRegistry.sol
│   ├── SubiTreasury.sol
│   ├── SubiDistributor.sol
│   └── PledgeRegistry.sol
├── test/                   # Comprehensive tests
│   ├── SubiDistributor.test.ts
│   └── SubiTreasury.test.ts
├── agent/                  # Agent API
│   ├── config.ts
│   ├── transactions.ts
│   └── README.md
├── app/                    # Next.js frontend
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── scripts/
│   └── deploy.ts
├── hardhat.config.ts
├── package.json
└── README.md               # Full documentation
```

---

## Next Steps (Post-Hackathon)

### Technical
1. Smart contract audit (focus on distributor arithmetic)
2. Self protocol integration (real ZK proof verification)
3. Frontend wallet connection (wagmi)
4. Mainnet deployment (after audit)

### Institutional
1. Present at Argentina Space conference (Salta, Nov 11-13 2026)
2. Get first Space Dividend Pledge signature
3. Pilot with 1,000 verified humans in Argentina
4. Present to UNCOPUOS (Q3 2027)

### Growth
1. MiniPay Mini App submission
2. Expand stablecoin support (all Mento currencies)
3. Document attestation for populations without passports
4. Regional scale (Latin America via wFIAT)

---

## Why This Wins

Most hackathon projects are demos. SUBI is a deployment plan.

The space industry needs treaty compliance infrastructure — not in theory, now. UNCOPUOS Working Group on Space Resources concludes in 2027. There's a 9-month window to show a working alternative to the failed "technology transfer between states" model.

Celo is the only chain where this works:
- Self identity (no other chain has passport-based ZK proofs)
- Fee abstraction (UBI recipients can't afford gas tokens)
- MiniPay (distribution channel already deployed)
- Stablecoin diversity (local currencies matter for purchasing power)

If a space company signs the first pledge on-chain at Argentina Space in November, and Argentina presents this to the UN in 2027, that's not a hackathon project — that's infrastructure.

---

## Contact

- **Author**: Arturo Grande
- **Telegram**: [@artugrande](https://t.me/artugrande)
- **Website**: [subi.space](https://subi.space)
- **Repository**: [github.com/artugrande/subi-concierge-agent](https://github.com/artugrande/subi-concierge-agent)

Thank you for considering SUBI for Judges' Favorite. 🚀
