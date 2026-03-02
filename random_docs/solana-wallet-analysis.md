# DataClaw Creator Fee Wallet Analysis

**Wallet:** [`3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu`](https://solscan.io/account/3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu)
**Last updated:** March 2, 2026
**Balance:** ~752 SOL

## What is this?

This wallet collects creator fees from tokens traded on [Pump.fun](https://pump.fun) / PumpSwap. Every trade on a PumpSwap pool charges a 0.05% creator fee, which is automatically claimed to this wallet by a bot.

The wallet receives fees from three tokens: **DataClaw** and two **DESLOPPIFY** tokens. All DataClaw fees are being donated to [The Arca Gidan Art Prize](https://arcagidan.com/).

## Fee Split

Since individual fee claims don't identify which token they came from (they go through a shared vault), the split is estimated using the trading volume ratio between tokens.

| Token | Total Volume | Share | Est. Fees |
|-------|-------------|-------|-----------|
| DataClaw | $7.4M | 90.4% | ~680 SOL |
| DESLOPPIFY #2 | $307K | 3.7% | ~28 SOL |
| DESLOPPIFY #3 | $478K | 5.8% | ~44 SOL |
| **Total** | **$8.2M** | **100%** | **~752 SOL** |

Volume data from GeckoTerminal. It understates absolute volume (~26x) but the ratio between tokens is reliable.

## Daily Volume History

### DataClaw

| Date | Volume |
|------|--------|
| Feb 25 | $5,789,847 |
| Feb 26 | $1,236,280 |
| Feb 27 | $220,334 |
| Feb 28 | $77,246 |
| Mar 1 | $56,650 |
| Mar 2 | $33,552 |

### DESLOPPIFY #2

| Date | Volume |
|------|--------|
| Feb 25 | $274,259 |
| Feb 26 | $17,644 |
| Feb 27 | $8,080 |
| Feb 28 | $6,955 |
| Mar 1 | $31 |
| Mar 2 | $175 |

### DESLOPPIFY #3

| Date | Volume |
|------|--------|
| Feb 27 | $163,117 |
| Feb 28 | $211,865 |
| Mar 1 | $62,244 |
| Mar 2 | $41,208 |

## How Fees Work

1. Someone trades on a PumpSwap pool — 0.05% goes to the token creator
2. Fees accumulate as wrapped SOL in a per-token vault
3. A bot periodically transfers fees from the vault to a shared Pump.fun account
4. The bot then claims from the shared account to this wallet

Because step 4 uses a shared account, individual claims can't be traced back to a specific token — hence the volume-based estimation above.

## On-Chain References

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

## Updating This Data

Run `node scripts/fetch-fee-data.mjs` to get current wallet balance and fee split.
