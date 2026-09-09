# SUBI Concierge Agent - Hackathon Submission Summary

> **Nota de estado (9 de septiembre de 2026).** Este documento describe lo que se
> presentó al hackathon y se mantiene como registro de eso. Después de la
> premiación se encontraron y corrigieron fallas serias, y el sistema se
> redesplegó. Ver [Después del hackathon](#después-del-hackathon) al final.


## 🎉 Completion Status: READY FOR SUBMISSION

**Date**: September 8, 2026  
**Author**: Arturo Grande  
**Telegram**: @artugrande  
**Track**: Judges' Favorite

---

## ✅ All Requirements Met

### 1. Next.js MiniPay-Friendly Web App ✅
- **Location**: `/app/`
- Next.js 15 with App Router
- Mobile-first UI optimized for MiniPay browser
- Claim and Pledge flows with educational content
- Fee abstraction (CIP-64) explained in UI

### 2. Smart Contracts for Celo Mainnet + Sepolia ✅
- **Location**: `/contracts/`
- **SubiRegistry.sol**: Self-verified identity registry
- **SubiTreasury.sol**: Stablecoin custody with attribution
- **SubiDistributor.sol**: Alaska POMV-style perpetual distribution
- **PledgeRegistry.sol**: Voluntary commitment ledger
- All contracts compile with `npm run compile`
- Deployment scripts ready for both networks

### 3. On-Chain Minimal Contracts ✅
- Treasury accepts stablecoin pledges/donations ✅
- Claim path designed for Self-verified humans ✅
- Self integration stubs clearly labeled (NEVER fake proofs) ✅
- Fee abstraction/CIP-64 awareness in UX copy ✅

### 4. Agent Surface ✅
- **Location**: `/agent/`
- Builds unsigned transactions for pledge + claim (celo-mcp style)
- Configuration with placeholders for:
  - `AGENT_ID` (ERC-8004 placeholder)
  - `AGENT_WALLET` (placeholder)
  - `ATTRIBUTION_TAG` (celo_... placeholder)
- Full API documentation in `agent/README.md`

### 5. README ✅
- **Location**: `README.md`
- Run instructions ✅
- Hackathon registration notes ✅
- ERC-8004 Agent ID placeholder ✅
- Telegram @artugrande ✅
- Judges' Favorite pitch (Self + no-token UBI + Celo stables + MiniPay) ✅
- Anti-farming notes ✅

### 6. Tests ✅
- **Location**: `/test/`
- `SubiDistributor.test.ts`: Distribution math, solvency, O(1) claims
- `SubiTreasury.test.ts`: Deposits, attribution, withdrawals
- Run with `npm test`

### 7. Commits During Hackathon ✅
- All work committed with descriptive messages
- Pushed to public repository
- Clean git history showing development progression

---

## 📦 Deliverables Overview

### Smart Contracts (4 files)
```
contracts/
├── ISubiRegistry.sol        # Interface
├── SubiRegistry.sol         # Self-verified registry (stub for MVP)
├── SubiTreasury.sol         # Stablecoin custody
├── SubiDistributor.sol      # Perpetual UBI distribution
├── PledgeRegistry.sol       # Voluntary pledges
└── MockERC20.sol            # Testing
```

### Tests (2 comprehensive suites)
```
test/
├── SubiDistributor.test.ts  # 15+ test cases
└── SubiTreasury.test.ts     # 10+ test cases
```

### Agent API (celo-mcp style)
```
agent/
├── config.ts                # Placeholders for agent ID/wallet
├── transactions.ts          # Unsigned tx builders
└── README.md                # Full API docs
```

### Web App (Next.js 15)
```
app/
├── page.tsx                 # Main UI (Claim + Pledge)
├── layout.tsx               # MiniPay-optimized layout
└── globals.css              # Celo brand styling
```

### Documentation
```
README.md                    # 18,000+ words comprehensive guide
HACKATHON.md                 # Detailed hackathon submission notes
LICENSE                      # MIT License
.env.example                 # Configuration template
```

### Deployment
```
scripts/deploy.ts            # Both Sepolia and Mainnet
hardhat.config.ts            # Network configuration
```

---

## 🎯 Why This Wins Judges' Favorite

### 1. Real Institutional Problem
- **140+ countries** ratified Outer Space Treaty with benefit-sharing obligation
- **$1.8T space economy** projected by 2035 (WEF/McKinsey)
- **Zero operational mechanism** to comply with Article I
- **UNCOPUOS deadline**: 2027 for Working Group recommendations

### 2. Celo Primitives Working Together
- ✅ **Self**: ZK proof from passport NFC (no biometrics, no PII)
- ✅ **CIP-64**: Gas paid in stablecoins (critical for UBI recipients)
- ✅ **MiniPay**: 11M wallets, instant distribution
- ✅ **Mento**: 21 currencies for local purchasing power

### 3. Technical Innovation
- **O(1) claim cost** via accumulated index pattern
- **Perpetual solvency** (distributes %, never fixed amount)
- **Conservative accounting** (overpays never, underpays when stale)
- **Anti-farming design** (nullifiers, non-transferable, proof-of-life)

### 4. State-Adoptable
Unlike Worldcoin (biometric concerns) or token-based UBI:
- Uses government-issued documents
- No speculative token
- Voluntary pledges
- Open-source reference

---

## 🔧 Quick Verification Commands

```bash
# Clone and setup
git clone https://github.com/artugrande/subi-concierge-agent.git
cd subi-concierge-agent
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Start web app
npm run dev
# Open http://localhost:3000

# Deploy to testnet
npm run deploy:sepolia
```

---

## 📊 Implementation Stats

- **Lines of Solidity**: ~800
- **Test Coverage**: 25+ test cases
- **Agent API Functions**: 5 transaction builders + 1 query function
- **Documentation**: 20,000+ words across README, HACKATHON, agent docs
- **Commits**: 4 (clean, descriptive)
- **Build Time**: ~24 hours (Cloud Agent)

---

## 🚀 Post-Hackathon Roadmap

### Phase 1: Self Integration (Q1 2027)
- Integrate real `SelfVerificationRoot` contract
- ZK proof verification on-chain
- Test with 10 verified humans on Sepolia

### Phase 2: Pilot (Q2 2027)
- 1,000 verified humans in Argentina
- $500k treasury funding
- 12-month duration
- Target: $1.37/day per person

### Phase 3: UNCOPUOS (Q3 2027)
- Present operational mechanism to UN
- Demonstrate voluntary sharing works

### Phase 4: Scale (2028+)
- Regional (Latin America)
- Global (174+ countries via Self)

---

## 📄 Files Index

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `README.md` | Main documentation | 800+ | ✅ Complete |
| `HACKATHON.md` | Submission details | 300+ | ✅ Complete |
| `contracts/SubiDistributor.sol` | Core UBI logic | 250+ | ✅ Complete |
| `contracts/SubiRegistry.sol` | Identity registry | 150+ | ✅ Complete |
| `contracts/SubiTreasury.sol` | Custody | 100+ | ✅ Complete |
| `contracts/PledgeRegistry.sol` | Pledges | 150+ | ✅ Complete |
| `test/SubiDistributor.test.ts` | Distribution tests | 300+ | ✅ Complete |
| `test/SubiTreasury.test.ts` | Treasury tests | 150+ | ✅ Complete |
| `agent/transactions.ts` | Agent API | 250+ | ✅ Complete |
| `agent/README.md` | Agent docs | 200+ | ✅ Complete |
| `app/page.tsx` | Web UI | 200+ | ✅ Complete |
| `scripts/deploy.ts` | Deployment | 100+ | ✅ Complete |

---

## 🎤 Elevator Pitch (Final Version)

Article I of the Outer Space Treaty says space exploration is "for the benefit of all countries" — but there's no way to deliver that benefit to actual humans.

SUBI is the infrastructure: passport-based identity (Self ZK proofs, no biometrics), stablecoin distribution (no farming token), Celo fee abstraction (gas paid in the currency you receive), and MiniPay reach (11M wallets, zero friction).

The pitch to space companies isn't "charity" — it's "transparent compliance with the treaty your country already ratified."

---

## ✉️ Contact

- **Author**: Arturo Grande
- **Telegram**: [@artugrande](https://t.me/artugrande)
- **Website**: [subi.space](https://subi.space)
- **Repository**: [github.com/artugrande/subi-concierge-agent](https://github.com/artugrande/subi-concierge-agent)

---

## 🏆 Ready for Judging

This project is **complete and ready for submission** to the **Judges' Favorite** track of the Celo Agents at Work Hackathon.

All requirements met. All code pushed. All documentation written.

Thank you for considering SUBI Concierge Agent. 🚀

---

## Después del hackathon

Lo de arriba es el registro de la entrega. Lo que sigue pasó después, y cambia
cosas importantes.

### Lo que estaba roto

El despliegue original **no podía pagarle a nadie**, por dos fallas independientes:

1. `registry.distributor` en mainnet apuntaba a `0x…01`, un placeholder que quedó
   del deploy y nunca se reemplazó porque el campo era `immutable`. El registry
   nunca notificó al distributor, así que los checkpoints jamás se escribieron.
2. `distributable()` leía sólo el balance del propio distributor, pero los aportes
   entran al treasury y no existía camino de fondos entre ambos. Con 0,5 USDT en el
   treasury, `claim()` revertía siempre con `NothingToClaim`.

La suite de tests no lo detectaba porque fondeaba el distributor directo con
`asset.mint(...)`, sin pasar por el treasury, y porque su propio `beforeEach`
reproducía el mismo placeholder.

### Lo que se corrigió

- Registry, treasury y distributor se cablean después del deploy y se verifica el
  cableado; `scripts/deploy-core.ts` aborta si algo queda suelto.
- `distributable()` cuenta el treasury y `claim()` tira de ahí el faltante.
- El aviso al distributor ocurre antes de mover el contador del padrón.
- Dar de baja devuelve lo no cobrado al pool en vez de trabarlo para siempre.
- El repo no compilaba desde un clone limpio: `@celo/attribution-tags@^1.0.0` no
  existe en npm, faltaba declarar `@openzeppelin/contracts` y el config compilaba
  con solc 0.8.20 contra contratos que declaran `^0.8.24`.

### Verificación de identidad, ahora de verdad

En la entrega, el registry aceptaba un nullifier arbitrario por parámetro. Estaba
declarado como stub y no se fingieron pruebas, pero no probaba nada.

Ahora `SubiRegistry` hereda de `SelfVerificationRoot` de `@selfxyz/contracts`, y el
alta ocurre **únicamente** en `customVerificationHook`, que sólo puede disparar el
Identity Verification Hub de Self tras validar la prueba ZK. La dirección que se da
de alta sale de la propia prueba, así que nadie puede registrar a un tercero.
`register(bytes32)` ya no existe en la ABI.

### MCP propio

`/api/mcp` expone el estado del padrón y del fondo, y arma transacciones sin firmar.
Ver [docs/MCP.md](docs/MCP.md).

### Redespliegue

Contratos vigentes en Celo mainnet, con el cableado verificado on-chain:

| Contrato | Dirección |
|---|---|
| SubiDistributor | `0x82c3273381F96027f78CcB3595b3606203e453CC` |
| SubiRegistry | `0x7eb6a75AeCcD8D90F5f9c2D46eb92ab5535e439A` |
| SubiTreasury | `0xf9b22b915C881F0565CCC7B0874f7F7032eDeb76` |
| PledgeRegistry | `0xaa572f7F6b141B99768a5eE542967A263d2a8071` |

El set anterior queda retirado y figura en `deployment-mainnet.json` bajo
`supersedes`, con el motivo.

Con el treasury fondeado con 0,5 USDT y el distributor en cero, `distributable()`
devuelve `500000`: exactamente la condición que antes daba `0`.

**46 tests en verde**, contra los 2 suites de la entrega.
