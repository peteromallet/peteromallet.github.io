# Creator Fee Wallet — How Much Came From Each Token?

**Wallet:** [`3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu`](https://solscan.io/account/3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu)
**Last updated:** March 17, 2026

| Token | Est. Fees | Share | Status |
|-------|----------|-------|--------|
| **DataClaw** | **~688 SOL** | **87.6%** | Untouched — committed to [The Arca Gidan Art Prize](https://arcagidan.com/) |
| DESLOPPIFY #2 | ~27 SOL | 3.6% | Spent on bounties & ecosystem |
| DESLOPPIFY #3 | ~68 SOL | 8.8% | Spent on bounties & ecosystem |
| **Total collected** | **~785 SOL** | | ~764 SOL remaining in wallet |

*These are estimates — see below for how they're calculated, why, and how to verify them yourself.*

---

## How we get these numbers

This wallet collects Pump.fun creator fees from three tokens: **DataClaw**, **DESLOPPIFY #2**, and **DESLOPPIFY #3**. Every trade charges a 0.05% creator fee in SOL, which gets auto-claimed to this wallet.

The problem: **fees from all three tokens land in the same wallet with no label**. There's no on-chain way to tell which fee came from which token. So we estimate the split using each token's share of total trading volume.

## The calculation

### Step 1: Current wallet balance (verifiable on-chain)

| | SOL |
|---|---|
| Current wallet balance | ~764 |

Anyone can check this on [Solscan](https://solscan.io/account/3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu).

### Step 2: Add back any SOL that's been sent out

Some SOL has already been spent from the DESLOPPIFY side (bounties, etc). To calculate the true fee split, we need to add that back.

| Date | Amount (SOL) | Purpose | TX |
|------|-------------|---------|-----|
| ~Mar 2026 | TODO | $1,000 bounty to @agustif (Initiative #1) | TODO |
| ~Mar 2026 | TODO | Transfer to other wallet (~$3K) | TODO |
| | **~21 SOL** | **Total sent out (estimated)** | |

*Estimated at ~$4K / ~$190 per SOL. These outflows can be independently verified on [Solscan](https://solscan.io/account/3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu) — filter for outgoing SOL transfers. Fill in the exact SOL amounts and TX signatures once confirmed.*

### Step 3: Total fees ever collected

```
Total fees = current balance + total sent out
           = 764 + ~21
           = ~785 SOL
```

### Step 4: Volume ratio from GeckoTerminal

Each token's share of total trading volume determines its share of fees. Since all three tokens charge the same 0.05% fee rate, fees are proportional to volume.

| Token | Total Volume | Share |
|-------|-------------|-------|
| DataClaw | $7,519,148 | 87.6% |
| DESLOPPIFY #2 | $307,655 | 3.6% |
| DESLOPPIFY #3 | $758,866 | 8.8% |
| **Total** | **$8,585,669** | **100%** |

Volume data from [GeckoTerminal](https://www.geckoterminal.com/) daily OHLCV candles, summed across all trading days.

### Step 5: Per-token fees

```
DataClaw fees      = ~785 × 87.6% = ~688 SOL
DESLOPPIFY #2 fees = ~785 × 3.6%  = ~28 SOL
DESLOPPIFY #3 fees = ~785 × 8.8%  = ~69 SOL
```

All outflows so far came from the DESLOPPIFY side — the ~688 SOL attributed to DataClaw is untouched and still sitting in the wallet.

## Why this estimate is reasonable

- **The wallet balance is a hard fact.** Anyone can verify it on Solscan.
- **All three tokens charge the same 0.05% fee.** Fees should be proportional to volume.
- **DataClaw's dominance is overwhelming.** ~88% of all volume — even if the exact percentage is slightly off, DataClaw generated the vast majority of the fees.
- **All outflows are trackable.** Every SOL that leaves the wallet has an on-chain transaction signature.

## Limitations

- **Volume data comes from one source: [GeckoTerminal](https://www.geckoterminal.com/).** No other free API provides lifetime pool volume for PumpSwap tokens. GeckoTerminal understates absolute volume (by ~26x based on earlier checks), but the *ratio* between tokens should be reliable since all three trade on the same platform using the same data source.
- **The split is an estimate, not a proof.** There's no on-chain mechanism to attribute individual fee claims to specific tokens.
- **We assume no other tokens generate fees to this wallet.** If there are tokens we're not tracking, the split would be off. (We're not aware of any.)

## Why can't we just filter by token on-chain?

Here's how PumpSwap creator fees work:

1. Someone trades a token on a PumpSwap pool — 0.05% goes to the token creator
2. Fees accumulate as wrapped SOL in a **per-token vault**
3. A bot transfers fees from the vault to a **shared Pump.fun account**
4. The bot claims from the shared account to this wallet

The per-token attribution is lost at step 3. By the time SOL arrives in the wallet, it's just SOL — there's no record of which token generated it.

## Verify it yourself

### 1. Check the wallet balance
Go to [Solscan](https://solscan.io/account/3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu) and look at the SOL balance.

### 2. Check outflows
On the same Solscan page, look at outgoing SOL transfers. These are the amounts to subtract when calculating fee attribution.

### 3. Check each token's trading volume
Look up each pool on GeckoTerminal to see its historical volume:

- [DataClaw pool](https://www.geckoterminal.com/solana/pools/A9aoE41kUqsKcYGSr5hvhZ2hJF5xZCWuE9D94J8ZPbkd)
- [DESLOPPIFY #2 pool](https://www.geckoterminal.com/solana/pools/4jnx2RJNCeoeiktf4TUjxvXJz5two7D8Dux5Bha3u6Gf)
- [DESLOPPIFY #3 pool](https://www.geckoterminal.com/solana/pools/6e1K4qBHmXpAFdZzFCPyL3LAn2iGtPsieeopc4AjYKp6)

Sum the total volume for each, then calculate each token's percentage of the combined total.

### 4. Do the math
```
total_fees = wallet_balance + total_outflows
dataclaw_fees = total_fees × (dataclaw_volume / total_volume)
```

### 5. Confirm these are the only tokens
The wallet is the registered creator for these three tokens on Pump.fun. If you find additional tokens with this wallet as creator, the calculation would need to include them.

## On-chain references

| What | Address |
|------|---------|
| Creator wallet | `3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu` |
| DataClaw mint | `Duxeg8HrG89Dq95oyiydrnFd8irZhjApGZu8PYrEpump` |
| DataClaw pool | `A9aoE41kUqsKcYGSr5hvhZ2hJF5xZCWuE9D94J8ZPbkd` |
| DESLOPPIFY #2 mint | `2XZyVjE6r5p84wL8CqHKFXH2v9iTd21cBRsoPpCJpump` |
| DESLOPPIFY #2 pool | `4jnx2RJNCeoeiktf4TUjxvXJz5two7D8Dux5Bha3u6Gf` |
| DESLOPPIFY #3 mint | `6mjs2797K62H8vXWUkYikdkNiP3zsfmybC9Zq6z4pump` |
| DESLOPPIFY #3 pool | `6e1K4qBHmXpAFdZzFCPyL3LAn2iGtPsieeopc4AjYKp6` |
| Auto-claim bot | `2sMrGNK8i36YRkF5WWCwnaUYuwDJhHe1g2xA8aPvhkjM` |
| PumpSwap program | `pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA` |

## Updating this data

Run `node scripts/fetch-fee-data.mjs` to get the current wallet balance and fee split. Note: the script doesn't account for outflows — you need to add those manually using Step 2 above.
