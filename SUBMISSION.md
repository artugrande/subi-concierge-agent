# SUBI Concierge Agent

**Celo Agents at Work — Judges' Favorite**

A conversational agent that takes a person from zero to receiving a universal basic
income funded by space resources: verify identity with Self, contribute to the
treasury, claim the dividend. All on Celo, paying gas in the same stablecoin being
claimed.

- **Live site:** https://subi.space · **Demo walkthrough:** https://subi.space/demo
- **Full proposal:** https://subi.space/propuesta
- **Agent ID (ERC-8004):** 9822 · **Attribution tag:** `celo_ac17e664a585`

> This document describes the **current state** of the project. It has moved
> substantially since the judging snapshot; the [Trajectory](#trajectory) section at
> the end says exactly what changed and when, so nothing here reads as a claim about
> what was judged.

---

## The problem

Article I of the 1967 Outer Space Treaty declares space "the province of all
mankind". It is a benefit-sharing obligation with no collecting body, no register of
recipients and no payment channel. Sixty years later the international regime has
settled the right to extract and left the duty to share unresolved.

SUBI is the missing payment channel: a permissionless treasury any space operator can
contribute to, and a register of verified humans that draws from it daily.

**No native token.** Contributions and payouts are stablecoins. That is what makes it
something a state can endorse without regulatory exposure, and what separates it from
every other basic-income-with-identity project.

---

## What is live on Celo mainnet

| Contract | Address |
|---|---|
| SubiDistributor | `0x82c3273381F96027f78CcB3595b3606203e453CC` |
| SubiRegistry | `0x7eb6a75AeCcD8D90F5f9c2D46eb92ab5535e439A` |
| SubiTreasury | `0xf9b22b915C881F0565CCC7B0874f7F7032eDeb76` |
| PledgeRegistry | `0xaa572f7F6b141B99768a5eE542967A263d2a8071` |
| Asset | USDT `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` |

Canonical source: [`deployment-mainnet.json`](deployment-mainnet.json), which also
records the verified cross-wiring and the superseded deployment.

---

## Identity: real Self verification

Registration happens **only** inside `customVerificationHook`, which can be triggered
only by Self's Identity Verification Hub after it has validated a zero-knowledge
proof. There is no other way into the register.

```solidity
contract SubiRegistry is ISubiRegistry, SelfVerificationRoot {
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory
    ) internal override {
        address account = address(uint160(output.userIdentifier));
        _register(account, output.nullifier);
    }
}
```

The address being registered comes from `output.userIdentifier`, which is part of the
proof, so nobody can register a third party. `register(bytes32)` does not exist in the
ABI: there is no unverified path to remove.

- The `nullifier` is deterministic per document and per scope, and reveals nothing
  about the document.
- The scope derives from this contract's address plus a seed, so a SUBI nullifier is
  not correlatable with the same person's nullifier in any other Self application.
- One document cannot be bound to two addresses (`NullifierInUse`).
- Proof of life expires after 12 months; re-verifying renews it without duplicating
  the seat.

Hub addresses come from Self's own integration boilerplate, not from guesswork:
mainnet `0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF`, Celo Sepolia
`0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74`. The deploy script resolves the hub by
chain id and **aborts** if the network has none or if the hub has no code.

---

## Distribution: the amount is derived, not set

```
budget    = distributable × drawRate × (Δt / 365d)
perCapita = budget / activeHumans
```

Three properties fall out of that, and they are the whole argument:

- **Insolvency is structurally impossible.** It distributes a fraction of what
  exists, never a promised amount. If the treasury shrinks, the dividend shrinks.
- **Zero discretion.** The individual amount is the result of a division, not a vote.
- **O(1) cost per user.** Accumulated-index accounting: someone can disappear for a
  year and their claim costs the same gas as someone claiming daily.

With the draw rate below the fund's real return the dividend is perpetual. This is the
Alaska Permanent Fund criterion, which has paid a resource dividend since 1982.

`distributable()` counts the treasury balance, and `claim()` pulls only the shortfall,
so contributions never have to be pre-moved.

---

## Agent surface

### Conversational agent
Guides a user through verify → contribute → claim, in the currency they live in.
Payouts can settle in any of 21 local stablecoins on Celo, including wARS with a
zero-cost off-ramp for Argentina.

### MCP server — `/api/mcp`
The project's own MCP, JSON-RPC 2.0 over HTTP. Deliberately **not** added to the
official Celo MCP: that is a general-purpose chain tool, not the place for one
project's endpoints.

| Tool | Purpose |
|---|---|
| `subi_status` | Treasury, register size, distributable, daily dividend per person |
| `subi_claimable` | What an address can claim right now |
| `subi_registration` | Whether an address is in the register and when its proof expires |
| `subi_contracts` | Deployed addresses and network data |
| `subi_build_deposit` | Builds the `approve` + `deposit`, **unsigned** |
| `subi_build_claim` | Builds the `claim`, **unsigned** |

Write tools return `to` / `data` / `value` and stop there. The server holds no keys and
custodies nothing. See [`docs/MCP.md`](docs/MCP.md).

### Celo primitives used
Fee abstraction (CIP-64) so gas is paid in the payout stablecoin and nobody needs
CELO; Mento and Ripio wFIAT stablecoins for local-currency payout; MiniPay as the
distribution channel; ERC-8004 for on-chain agent identity.

---

## Tests

**46 passing**, across four suites:

| Suite | Covers |
|---|---|
| `SelfVerification.test.ts` | The verification path: only the hub can register, one document cannot hold two seats, renewal, expiry and reaping, and an end-to-end claim from a verified identity |
| `Wiring.test.ts` | Registry/treasury/distributor wiring, treasury funds counting as distributable, no retroactive dilution on registration, no funds stranded on exit |
| `SubiDistributor.test.ts` | Distribution math, solvency, O(1) claims, fractional carry |
| `SubiTreasury.test.ts` | Deposits, attribution ledger, withdrawal authorisation |

`MockSelfHub` replicates the real hub's function signatures, so the callback path is
exercised for real rather than stubbed around. If Self changes those signatures
upstream, the mock breaks and says so instead of passing falsely.

---

## Running it

```bash
git clone https://github.com/artugrande/subi-concierge-agent
cd subi-concierge-agent && npm install
cp .env.example .env          # set DEPLOYER_PRIVATE_KEY

npx hardhat test              # contract suite
npm run dev                   # agent UI + MCP at /api/mcp
npm run deploy:mainnet        # deploys the four contracts and verifies the wiring
```

---

## What is not done

Stated plainly, because a proposal that hides its gaps is not worth evaluating:

- **The fund is symbolic.** 0.5 USDT seeded. The mechanism is real; the money is not
  yet. Bringing in contributors is the actual next problem, and it is a political one,
  not a technical one.
- **`test/Attribution.test.ts` does not run.** `@celo/attribution-tags` is ESM and the
  Hardhat runner is CommonJS. Fixing it means migrating the project to ESM or moving
  that dependency behind a dynamic import.
- **The wiring CALLs in `deploy-core.ts` carry no attribution tag**, only the
  deployments do. Pending confirmation of whether the track requires it on every CALL.
- **The pilot is not running.** Milestones and the metrics it will be measured
  against are published at https://subi.space/demo — 1,000 people, under 3 minutes to
  register, under 0.5% infrastructure overhead.

---

## Trajectory

The judged submission and this document are not the same thing, and the difference
matters.

**At judging**, the register accepted a nullifier as a parameter. It was labelled a
stub and no proofs were faked, but it proved nothing. Two further faults were found
afterwards, and together they meant the deployed system **could not pay anyone**:

1. `registry.distributor` on mainnet pointed at `0x…01`, a deploy-time placeholder
   that was never replaced because the field was `immutable`. The registry never
   notified the distributor, so checkpoints were never written.
2. `distributable()` read only the distributor's own balance, but contributions land
   in the treasury and no code path moved funds between them. `claim()` reverted every
   time with `NothingToClaim`.

The test suite did not catch either, because it funded the distributor directly with
`asset.mint(...)` and its own setup reproduced the same placeholder.

**Since then:** both faults fixed and verified on-chain, the four contracts redeployed
with verified wiring, real Self verification integrated, the MCP built, and the test
count taken from 2 suites to 46 passing tests. The superseded deployment is recorded
in `deployment-mainnet.json` under `supersedes`, with the reason.

The proof that the money path works is one read: with the treasury holding 0.5 USDT
and the distributor holding zero, `distributable()` returns `500000`. That is exactly
the condition that used to return `0`.
