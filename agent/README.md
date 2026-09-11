# SUBI Concierge Agent · transaction builders

`agent/transactions.ts` builds the transactions a user, or another agent, signs to use SUBI on
Celo mainnet. It builds them and returns them. It never signs or sends anything, and it holds
no keys.

Every transaction built here carries two things:

- **The attribution tag** (ERC-8021) `celo_ac17e664a585`, appended to the calldata.
- **`feeCurrency`** (CIP-64) set to USDT, so gas is paid in the same stablecoin being moved and
  nobody needs to hold CELO. A wallet without CIP-64 support can ignore the field.

Contract addresses come from [`deployment-mainnet.json`](deployment-mainnet.json), the same
file the rest of the repo reads. Nothing here hardcodes them.

## Builders

| Function | Builds |
|---|---|
| `buildClaimUBITransaction(distributor)` | `SubiDistributor.claim()`. It takes no amount: the amount is derived from the accumulated index |
| `buildDepositTransactions(treasury, amount, attribution)` | `approve` + `SubiTreasury.deposit(amount, attribution)`, two transactions |
| `buildPledgeUBITransaction(pledgeRegistry, pledge)` | `PledgeRegistry.createPledge(...)`, a public commitment to contribute |
| `buildTransferTransaction(to, amount)` | A plain transfer, also tagged |
| `buildContractCallTransaction(address, signature, args, value?)` | Any other call |
| `buildTransactionBatch(builders)` | Several of the above at once |
| `getAgentInfo()` | Agent ID, wallet, attribution tag and fee currency |

## Examples

```ts
import deployment from "./deployment-mainnet.json";
import {
  buildClaimUBITransaction,
  buildDepositTransactions,
  buildPledgeUBITransaction,
} from "./transactions";

// Claim what has accrued.
const claim = await buildClaimUBITransaction(deployment.contracts.distributor);

// Contribute 10 USDT (6 decimals). Returns [approve, deposit].
const [approve, deposit] = await buildDepositTransactions(
  deployment.contracts.treasury,
  10_000_000n,
  "Organisation name",
);

// Publish a Space Dividend Pledge.
const now = BigInt(Math.floor(Date.now() / 1000));
const pledge = await buildPledgeUBITransaction(deployment.contracts.pledgeRegistry, {
  name: "Organisation name",
  revenuePercentBps: 250,        // 2.5% of revenue
  annualFloorUSD: 1_000_000n,
  startDate: now,
  endDate: now + 31_536_000n,    // one year
  reportURI: "ipfs://…",
});
```

Each result is `{ to, data, value, feeCurrency }`, ready for a wallet to sign.

## Registration is deliberately not here

There is no builder for registering. Entry into the register happens only inside
`customVerificationHook`, which only Self's Identity Verification Hub can trigger, and only
after it validates a zero-knowledge proof. No transaction a user builds can register anyone,
so there is nothing to build. The flow lives at https://subi.space/verify.

## Tests

`test/Attribution.test.ts` checks that every builder appends the tag, sets `feeCurrency`, and
uses selectors that match the deployed signatures. That last check exists because an earlier
version encoded `claim(uint256)` and `pledge(address,uint256)`, neither of which exists on the
deployed contracts, and the tests only looked at the tag.

## Network

Celo mainnet, chain id `42220`, RPC `https://forno.celo.org`. The testnet is Celo Sepolia,
chain id `11142220`. Alfajores is retired.

## License

MIT
