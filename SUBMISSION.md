# SUBI Concierge Agent

**Celo Agents at Work Hackathon** · primary track: **Judges' Favorite**

A conversational agent that takes a person from zero to receiving a universal basic
income funded by space resources: verify identity with Self, contribute to the
treasury, claim the dividend. All on Celo, paying gas in the same stablecoin being
claimed.

- **Live site:** https://subi.space · **Demo walkthrough:** https://subi.space/demo
- **Full proposal:** https://subi.space/propuesta
- **Agent ID (ERC-8004):** 9822 · **Attribution tag:** `celo_ac17e664a585`

> This document describes the **current state** of the project as of 9 September 2026.
> It has moved substantially in the last week; the [Trajectory](#trajectory) section at
> the end says exactly what changed and when, including two faults that were live on
> mainnet and are now fixed.

**Verify it in five minutes**, without a wallet or any funds:

```bash
npm install
npm run verify:onchain   # reads Celo mainnet and checks every claim below
npm test                 # 58 contract tests
```

`verify:onchain` does not trust this repository: it takes the addresses from
`deployment-mainnet.json` and confirms against the chain that the contracts exist, that
the cross-wiring resolves in all three directions, that the treasury balance counts as
distributable, and that Self's config and scope are registered against the real hub. It
exits non-zero if anything fails.

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
| SubiDistributor | `0x1f945618F4bFa0e131E07FfA0335e7Ada6556279` |
| SubiRegistry | `0x72Aa7f3B4ca2c230cd710Ef847015f0B963F0232` |
| SubiTreasury | `0x093D55468acee5a9b11644d1E55097C4E99C2739` |
| PledgeRegistry | `0x642b4F2737E85f42bae5Fc4830544EBCf48F1F13` |
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

**Verifiable on-chain, not just in the source.** On the deployed registry
`0x72Aa7f3B4ca2c230cd710Ef847015f0B963F0232`:

- `verificationConfigId()` returns `0xc52f992ebee4435b00b65d2c74b12435e96359d1ccf408041528414e6ea687bc`, which
  means the constructor successfully registered its config against the real hub.
- `scope()` is non-zero, which means PoseidonT3 ran and the scope is genuinely derived
  from this contract's address plus the seed.
- The selector for `register(bytes32)` is **absent from the deployed bytecode**;
  calling it reverts. The unverified path is not disabled, it does not exist.

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
Payouts can settle in any of 13 currencies reachable from USDT in a single swap, including wARS with a
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

Write tools return `to` / `data` / `value` / `feeCurrency` and stop there. The server
holds no keys and custodies nothing. See [`docs/MCP.md`](docs/MCP.md).

### Attribution (ERC-8021)
The assigned code is `celo_ac17e664a585`. Tagging is wired into the deploy script and into
every transaction the agent and the MCP build, and is covered by tests.

It landed **after** the current contracts were deployed. Verified against the chain, the
four deployment transactions and the three wiring calls **do not carry the suffix**, and
ERC-8021 has no backfill: a tag cannot be added to a transaction once it is sent.
Transactions sent from here on carry it. Stated because it is checkable, and a reader
would find it.

`utils/attribution.ts` loads `@celo/attribution-tags` through a dynamic import wrapped
in `new Function`, because the package is pure ESM and the Hardhat runner is CommonJS;
a static import made `npm test` fail to start at all, which is the reason the tagging was
not effective at deploy time.

### Celo primitives used
Fee abstraction (CIP-64): every transaction the agent and the MCP build carries
`feeCurrency`, so gas is paid in the payout stablecoin and nobody needs CELO. A wallet
without CIP-64 support can ignore the field. Covered by a test. Mento and Ripio wFIAT stablecoins for local-currency payout; MiniPay as the
distribution channel; ERC-8004 for on-chain agent identity.

---

## Tests

**58 passing**, across five suites, and `npm test` runs the whole thing:

| Suite | Covers |
|---|---|
| `SelfVerification.test.ts` | The verification path: only the hub can register, one document cannot hold two seats, renewal, expiry and reaping, and an end-to-end claim from a verified identity |
| `Wiring.test.ts` | Registry/treasury/distributor wiring, treasury funds counting as distributable, no retroactive dilution on registration, no funds stranded on exit |
| `SubiDistributor.test.ts` | Distribution math, solvency, O(1) claims, fractional carry |
| `SubiTreasury.test.ts` | Deposits, attribution ledger, withdrawal authorisation |
| `Attribution.test.ts` | ERC-8021 tagging, including a real transaction whose calldata is read back from chain and decoded |

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

- **The register is empty.** `activeCount()` is `0`: no human has completed a Self
  verification against this registry on mainnet yet. The path is live and provable from
  the chain, but it has not been walked end to end in production. That is the honest
  reading of `npm run verify:onchain`, which reports it.
- **The fund is symbolic.** 0.5 USDT seeded. The mechanism is real; the money is not
  yet. Bringing in contributors is the actual next problem, and it is a political one,
  not a technical one.
- **The pilot is not running.** Milestones and the metrics it will be measured
  against are published at https://subi.space/demo — 1,000 people, under 3 minutes to
  register, under 0.5% infrastructure overhead.

---

## Trajectory

What this project looked like a week ago and what it looks like now are not the same
thing, and the difference matters more than a clean narrative would.

**Until 8 September**, the register accepted a nullifier as a parameter. It was
labelled a stub and no proofs were faked, but it proved nothing. Two further faults were
found alongside it, and together they meant the deployed system **could not pay anyone**:

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
count taken from 2 suites to 58 passing tests. The superseded deployment is recorded
in `deployment-mainnet.json` under `supersedes`, with the reason.

The proof that the money path works is one read: with the treasury holding 0.5 USDT
and the distributor holding zero, `distributable()` returns `500000`. That is exactly
the condition that used to return `0`.
