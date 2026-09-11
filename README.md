# SUBI Concierge Agent

A conversational agent that takes a person from zero to receiving a universal basic income
funded by space resources: verify identity with Self, contribute to the treasury, claim the
dividend. All on Celo, paying gas in the same stablecoin being claimed.

Submitted to the **Celo Agents at Work Hackathon**, primary track **Judges' Favorite**.

## Identity

| | |
|---|---|
| ERC-8004 Agent ID | `9822` |
| Attribution tag (ERC-8021) | `celo_ac17e664a585` |
| Agent wallet | `0x35422f585e1f570515147E557aEF8fD6a6e1b3b3` |
| Network | Celo mainnet, chain id `42220` |
| Live site | https://subi.space · [demo](https://subi.space/demo) · [verify](https://subi.space/verify) · [dashboard](https://subi.space/dashboard) · [proposal](https://subi.space/proposal) |
| Demo video | [on X](https://x.com/ArtuGrande/status/2098540560306823513) |

| Contract | Address |
|---|---|
| SubiDistributor | [`0x1f945618F4bFa0e131E07FfA0335e7Ada6556279`](https://celoscan.io/address/0x1f945618F4bFa0e131E07FfA0335e7Ada6556279) |
| SubiRegistry | [`0x72Aa7f3B4ca2c230cd710Ef847015f0B963F0232`](https://celoscan.io/address/0x72Aa7f3B4ca2c230cd710Ef847015f0B963F0232) |
| SubiTreasury | [`0x093D55468acee5a9b11644d1E55097C4E99C2739`](https://celoscan.io/address/0x093D55468acee5a9b11644d1E55097C4E99C2739) |
| PledgeRegistry | [`0x642b4F2737E85f42bae5Fc4830544EBCf48F1F13`](https://celoscan.io/address/0x642b4F2737E85f42bae5Fc4830544EBCf48F1F13) |
| Asset (USDT) | [`0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e`](https://celoscan.io/address/0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e) |

Canonical source: [`deployment-mainnet.json`](deployment-mainnet.json), which also records the
verified cross-wiring and every superseded deployment with its reason.

---

## Verify this in five minutes

Two commands. Neither needs a wallet, a key, or any funds.

```bash
npm install

npm run verify:onchain   # reads Celo mainnet, proves what is deployed
npm test                 # 58 contract tests
```

`verify:onchain` does not trust this repository. It takes the addresses from
`deployment-mainnet.json` and checks everything against the chain: that the four contracts
have bytecode, that the cross-wiring resolves in all three directions, that the treasury
balance counts as distributable, that Self's config and scope registered against the real
hub, and that the unverified registration path is absent from the deployed bytecode. It
exits non-zero if any check fails.

Expected output ends with `Todo verificado contra la cadena.`

Prefer to check without cloning anything? These three reads settle the substance:

```bash
# the treasury's money is visible to the distributor (this returned 0 before the fix)
cast call 0x1f945618F4bFa0e131E07FfA0335e7Ada6556279 "distributable()(uint256)" --rpc-url https://forno.celo.org

# Self's config registered against the real hub, so the ZK path is live
cast call 0x72Aa7f3B4ca2c230cd710Ef847015f0B963F0232 "verificationConfigId()(bytes32)" --rpc-url https://forno.celo.org

# the scope derives from this contract, so PoseidonT3 actually ran
cast call 0x72Aa7f3B4ca2c230cd710Ef847015f0B963F0232 "scope()(uint256)" --rpc-url https://forno.celo.org
```

---

## What it does

The amount of the dividend is never set by anyone. It is derived:

```
budget    = distributable × drawRate × (Δt / 365d)
perCapita = budget / activeHumans
```

- **Insolvency is structurally impossible.** It distributes a fraction of what exists, never
  a promised amount. If the treasury shrinks, the dividend shrinks.
- **Zero discretion.** The individual amount is the result of a division, not a vote.
- **O(1) cost per user.** Accumulated-index accounting: someone can disappear for a year and
  their claim costs the same gas as someone claiming daily.

---

## Identity: what is real and what is not

**Real.** Registration happens only inside `customVerificationHook`, which only Self's
Identity Verification Hub can trigger, and only after it has validated a zero-knowledge
proof. The address being registered comes from `output.userIdentifier`, which is part of the
proof, so nobody can register a third party. `register(bytes32)` is not disabled: its
selector `0xe1fa8e84` is **absent from the deployed bytecode**. `npm run verify:onchain`
checks this.

The hub address comes from Self's own integration boilerplate, not from guesswork, and the
deploy script resolves it by chain id and aborts if the network has none or the hub has no
code.

**Walked end to end, once.** The first registration landed on 11 September 2026
([`0x6e4833…2381`](https://celoscan.io/tx/0x6e4833ea0c6ff31cc60f9c9d3407db61be8e985c837b68c4c26087ce09e02381)), submitted by Self's relayer, and `activeCount()` is now
`1`. That person is the author, verifying with his own passport. One registration proves the
path works on mainnet; it is not adoption, and it is stated that way on purpose.

---

## End to end: register → pledge → deposit → claim

```bash
npm run dev     # agent UI, and the MCP server at /api/mcp
```

| Step | What happens | Contract call |
|---|---|---|
| 1. Register | Scan a passport in the Self app. The proof is generated on the device; the document never leaves it. Self's hub validates it and calls back. | `customVerificationHook` → `_register` |
| 2. Pledge | An organisation records a public commitment: a share of revenue in basis points, an annual floor, a date range and a public report URI. Optional, and independent of the rest. | `PledgeRegistry.createPledge` |
| 3. Deposit | Anyone contributes USDT to the treasury. The attribution string is kept in a public ledger. | `SubiTreasury.deposit` |
| 4. Claim | The dividend accrues per second. Claiming pulls the shortfall from the treasury automatically. | `SubiDistributor.claim` |

Steps 3 and 4 are also available over MCP as `subi_build_deposit` and `subi_build_claim`,
which return the transaction **unsigned**. The MCP server holds no keys and custodies
nothing. See [`docs/MCP.md`](docs/MCP.md).

---

## MiniPay and CIP-64 checklist

What a Celo-native payout flow needs, and where each piece stands here:

- [x] **Gas paid in the payout stablecoin.** Every transaction the agent and the MCP build
      carries `feeCurrency` (CIP-64), so a user claiming in USDT pays the fee in USDT and
      never has to hold CELO. A wallet without CIP-64 support can ignore the field and pay
      in CELO. Covered by a test.
- [x] **No network token in the onboarding path.** Nothing in register → claim requires
      acquiring CELO first.
- [x] **Local-currency payout.** Settlement in Mento and Ripio wFIAT stablecoins, including
      wARS with a zero-cost off-ramp for Argentina.
- [x] **Mobile-first surface.** The agent UI is built for a phone viewport.
- [ ] **Shipped as a MiniPay Mini App.** Designed for it, not yet published in MiniPay's
      discovery surface.
- [ ] **Gasless via MiniPay's relayer.** Fee abstraction covers the cost today; full
      sponsored relay is not wired.

---

## Attribution (ERC-8021)

The assigned code is `celo_ac17e664a585`. Tagging is wired into the deploy script and into
every transaction the agent and the MCP build, and is covered by tests.

It landed **after** the contracts above were deployed. Verified against the chain, the four
deployment transactions and the three wiring calls **do not carry the suffix**, and ERC-8021
has no backfill: a tag cannot be added to a transaction once it is sent. Transactions sent
from here on carry it.

Check any transaction yourself:

```bash
npx @celo/attribution-tags verifyTx <TX_HASH> --network celo
```

`utils/attribution.ts` loads `@celo/attribution-tags` through a dynamic import wrapped in
`new Function`, because the package is pure ESM and the Hardhat runner is CommonJS. A static
import makes `npm test` fail to start at all, and that failure is why the tagging was not
effective when the contracts were deployed. Note also that `toDataSuffix` already returns a
`0x`-prefixed string; prepending another one produces invalid calldata.

---

## Tests

**58 passing** across five suites. `npm test` runs all of them.

| Suite | Covers |
|---|---|
| `SelfVerification.test.ts` | Only the hub can register, one document cannot hold two seats, renewal, expiry and reaping, end-to-end claim from a verified identity |
| `Wiring.test.ts` | Cross-wiring, treasury funds counting as distributable, no retroactive dilution, no funds stranded on exit |
| `SubiDistributor.test.ts` | Distribution math, solvency, O(1) claims, fractional carry |
| `SubiTreasury.test.ts` | Deposits, attribution ledger, withdrawal authorisation |
| `Attribution.test.ts` | ERC-8021 tagging, `feeCurrency` on every built transaction, selectors matching the deployed signatures, and a real transaction read back from chain and decoded |

`MockSelfHub` replicates the real hub's function signatures, so the callback path is
exercised rather than stubbed around. If Self changes those signatures upstream, the mock
breaks and says so instead of passing falsely.

---

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Contract test suite (Hardhat) |
| `npm run verify:onchain` | Verify the mainnet deployment against the chain |
| `npm run compile` | Compile contracts |
| `npm run dev` | Agent UI and MCP server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run deploy:mainnet` | Deploy the four contracts to Celo mainnet and verify the wiring |
| `npm run deploy:sepolia` | Same, against Celo Sepolia (chain id `11142220`) |

Deploying needs a signer:

```bash
cp .env.example .env    # then set DEPLOYER_PRIVATE_KEY
```

`.env` is gitignored. Never commit it. The two read-only commands in
[Verify this in five minutes](#verify-this-in-five-minutes) need no key at all.

> Celo's testnet is **Celo Sepolia** (chain id `11142220`). Alfajores is retired; if you
> find a config referencing chain id `44787`, it is stale.

---

## Layout

- `contracts/` — Solidity sources
- `test/` — Hardhat test suites
- `scripts/` — deployment and on-chain verification
- `agent/` — agent logic and transaction builders, all attributed
- `app/api/mcp/` — the project's own MCP server
- `utils/attribution.ts` — ERC-8021 tagging helpers
- `config.ts` — agent configuration (tag, ID, wallet)
- `docs/MCP.md` — MCP tool reference

## Security

- Private keys are never committed; `.env` is gitignored.
- The MCP server's write tools return unsigned transactions only. It holds no keys.
- There is no unverified path into the register, and no admin function that can add one.

## License

MIT
