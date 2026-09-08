# Fee Abstraction (CIP-64) Guide

## Overview

SUBI uses Celo's fee abstraction (CIP-64) to let users pay gas in the stablecoin they're claiming or depositing. This eliminates the need to acquire native CELO tokens.

## How It Works

### Normal Blockchain
```
User wants to claim 10 USDC
→ Needs ETH/MATIC/BNB for gas
→ Must buy gas token on exchange
→ Bridge to wallet
→ THEN can claim
```

### Celo with CIP-64
```
User wants to claim 10 USDC
→ Gas paid in USDC directly
→ No CELO token needed
→ Claim immediately
```

## Implementation Status

### ✅ Supported Operations (CIP-64 Active)
- **Claim dividend**: Gas paid in cUSD/USDC/USDT/wARS
- **Deposit to treasury**: Gas paid in deposit currency
- **Submit pledge reports**: Gas paid in stablecoin

### ⚠️ First Registry Mint Exception

**First-time Self registration may require tiny CELO top-up** (~0.001 CELO = $0.0005)

**Why?**: Registry contract deployment might not have fee abstraction enabled initially. Once contract is "warmed up" with first mint, subsequent registrations use CIP-64.

**How to get CELO**: 
- Swap small amount on [Ubeswap](https://app.ubeswap.org/)
- Receive from faucet (testnet)
- Ask in Celo Discord

**After first mint**: All operations use fee abstraction ✅

## Supported Currencies

Users can pay gas in any of these:

### Mento Stablecoins (15)
- cUSD (US Dollar)
- cEUR (Euro)
- cREAL (Brazilian Real)
- cKES (Kenyan Shilling)
- cCOP (Colombian Peso)
- cPHP (Philippine Peso)
- cNGN (Nigerian Naira)
- cINR (Indian Rupee)
- cXOF (West African CFA)
- cZAR (South African Rand)
- cAUD (Australian Dollar)
- cCAD (Canadian Dollar)
- cGBP (British Pound)
- cCHF (Swiss Franc)
- cCNY (Chinese Yuan)

### Ripio wFIAT (6)
- wARS (Argentine Peso)
- wBRL (Brazilian Real)
- wCLP (Chilean Peso)
- wCOP (Colombian Peso)
- wMXN (Mexican Peso)
- wVES (Venezuelan Bolivar)

### Circle & Tether
- USDC
- USDT

## Agent Wallet Configuration

**Address**: `0x35422f585e1f570515147E557aEF8fD6a6e1b3b3`  
**Balance**: ~1.98 USDT  
**Native CELO**: 0 (relies entirely on fee abstraction)

This demonstrates that the system works with zero native tokens - exactly the UX recipients need.

## UX Copy for UI

### Claim Page
```
💡 No CELO token needed!
Gas is paid in the stablecoin you claim.
Powered by Celo's fee abstraction (CIP-64).

Note: First-time registration may require tiny CELO top-up (~$0.0005).
After that, everything runs on fee abstraction.
```

### Pledge Page
```
💡 Gas paid in the currency you deposit!
Deposit USDC? Gas in USDC.
Deposit cUSD? Gas in cUSD.

No need to acquire CELO token for gas.
```

## Technical Details

### How to Enable CIP-64

When deploying contracts, ensure feeCurrency parameter is supported:

```solidity
// Transaction with fee abstraction
{
  to: contractAddress,
  data: encodedFunctionCall,
  feeCurrency: usdcAddress  // Pay gas in USDC instead of CELO
}
```

Celo RPC automatically handles conversion:
1. User signs transaction specifying `feeCurrency: USDC`
2. Gas cost calculated (e.g., 0.0003 CELO = ~$0.0002)
3. Equivalent USDC deducted from user's balance
4. Validator receives CELO (protocol handles conversion)

### Wagmi/Viem Integration

```typescript
import { prepareSendTransaction, sendTransaction } from '@wagmi/core';

const config = await prepareSendTransaction({
  to: distributorAddress,
  data: claimData,
  feeCurrency: usdtAddress,  // CIP-64: pay gas in USDT
});

const { hash } = await sendTransaction(config);
```

### Ethers.js Integration

```typescript
import { ethers } from 'ethers';

const tx = await distributor.claim({
  feeCurrency: usdcAddress,  // CIP-64 parameter
});
```

## References

- [CIP-64 Specification](https://github.com/celo-org/celo-proposals/blob/master/CIPs/cip-0064.md)
- [Celo Fee Abstraction Docs](https://docs.celo.org/protocol/transaction/erc20-transaction-fees)
- [Supported Fee Currencies](https://docs.celo.org/protocol/transaction/erc20-transaction-fees#supported-fee-currencies)

## FAQ

### Q: Do I need to hold CELO token at all?
**A**: No, after first registry mint. Recipients can receive UBI without ever touching CELO.

### Q: What's the conversion rate for gas?
**A**: Real-time oracle price. If gas costs 0.0003 CELO ($0.0002), you pay $0.0002 worth of your stablecoin.

### Q: Does fee abstraction work on testnet?
**A**: Yes! Celo Alfajores testnet supports CIP-64 for all major stablecoins.

### Q: Is fee abstraction more expensive?
**A**: No. Same gas cost, just paid in different currency. Small conversion overhead (~0.1%) handled by protocol.

### Q: What if my stablecoin isn't supported?
**A**: Swap to supported currency first (Ubeswap, Mento), then claim. Takes <1 minute.

---

**Bottom line**: SUBI works for people who've never heard of gas, wallets, or blockchain. They scan passport, claim dollars, and spend. That's the UX.
