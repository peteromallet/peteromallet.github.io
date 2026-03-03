#!/usr/bin/env node

// Fetches current Solana wallet balance and estimates the DataClaw vs DESLOPPIFY
// fee split using historical trading volume ratios from GeckoTerminal.
//
// Usage: node scripts/fetch-fee-data.mjs

const RPC = 'https://api.mainnet-beta.solana.com';
const CREATOR_WALLET = '3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu';

const POOLS = [
  { label: 'DataClaw', pool: 'A9aoE41kUqsKcYGSr5hvhZ2hJF5xZCWuE9D94J8ZPbkd', mint: 'Duxeg8HrG89Dq95oyiydrnFd8irZhjApGZu8PYrEpump' },
  { label: 'DESLOPPIFY #2', pool: '4jnx2RJNCeoeiktf4TUjxvXJz5two7D8Dux5Bha3u6Gf', mint: '2XZyVjE6r5p84wL8CqHKFXH2v9iTd21cBRsoPpCJpump' },
  { label: 'DESLOPPIFY #3', pool: '6e1K4qBHmXpAFdZzFCPyL3LAn2iGtPsieeopc4AjYKp6', mint: '6mjs2797K62H8vXWUkYikdkNiP3zsfmybC9Zq6z4pump' },
];

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

async function getVolume(pool) {
  const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/day?aggregate=1&limit=100`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GeckoTerminal ${res.status}`);
  const data = await res.json();
  const candles = data.data?.attributes?.ohlcv_list || [];
  let total = 0;
  const daily = [];
  for (const c of candles.sort((a, b) => a[0] - b[0])) {
    const date = new Date(c[0] * 1000).toISOString().slice(0, 10);
    total += c[5];
    daily.push({ date, volume: c[5] });
  }
  return { total, daily };
}

async function main() {
  // 1. Wallet balance
  const balance = await rpc('getBalance', [CREATOR_WALLET]);
  const solBalance = balance.value / 1e9;

  // 2. Transaction count
  const sigs = await rpc('getSignaturesForAddress', [CREATOR_WALLET, { limit: 1000 }]);
  const txCount = sigs.length;

  // 3. Volume data per pool
  const volumes = [];
  for (const { label, pool } of POOLS) {
    await new Promise(r => setTimeout(r, 500));
    const vol = await getVolume(pool);
    volumes.push({ label, ...vol });
  }

  const totalVolume = volumes.reduce((s, v) => s + v.total, 0);

  // Output
  const today = new Date().toISOString().slice(0, 10);
  console.log(`\n=== Fee Data (${today}) ===\n`);
  console.log(`Wallet balance: ${solBalance.toFixed(2)} SOL`);
  console.log(`Total transactions: ${txCount}`);

  console.log(`\nVolume breakdown:`);
  for (const v of volumes) {
    const pct = (v.total / totalVolume * 100).toFixed(1);
    const estFees = (solBalance * v.total / totalVolume).toFixed(1);
    console.log(`  ${v.label.padEnd(16)} $${v.total.toLocaleString('en-US', { maximumFractionDigits: 0 }).padStart(12)}  (${pct}%)  ~${estFees} SOL`);
  }

  const dcVol = volumes[0].total;
  const dsVol = volumes.slice(1).reduce((s, v) => s + v.total, 0);
  const dcPct = (dcVol / totalVolume * 100).toFixed(1);
  const dsPct = (dsVol / totalVolume * 100).toFixed(1);
  const dcSOL = (solBalance * dcVol / totalVolume).toFixed(0);
  const dsSOL = (solBalance * dsVol / totalVolume).toFixed(0);

  console.log(`\nSummary:`);
  console.log(`  DataClaw:       ~${dcSOL} SOL (${dcPct}%)`);
  console.log(`  DESLOPPIFY all: ~${dsSOL} SOL (${dsPct}%)`);

  console.log(`\nFor website:`);
  const dateStr = today.replace(/(\d{4})-(\d{2})-(\d{2})/, (_, y, m, d) => {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
  });
  console.log(`  As of ${dateStr}, the wallet holds ~${Math.round(solBalance)} SOL (~${dcSOL} from DataClaw, ~${dsSOL} from DESLOPPIFY tokens) across ${txCount} Pump.fun creator fee claims.`);

  // 4. Token holdings (Token-2022)
  await new Promise(r => setTimeout(r, 1500));
  const t22 = await rpc('getTokenAccountsByOwner', [
    CREATOR_WALLET,
    { programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' },
    { encoding: 'jsonParsed' },
  ]);

  const TOKEN_NAMES = {
    'Duxeg8HrG89Dq95oyiydrnFd8irZhjApGZu8PYrEpump': 'DataClaw',
    '6mjs2797K62H8vXWUkYikdkNiP3zsfmybC9Zq6z4pump': 'DESLOPPIFY #3',
    '2XZyVjE6r5p84wL8CqHKFXH2v9iTd21cBRsoPpCJpump': 'DESLOPPIFY #2',
  };

  const holdings = t22.value
    .map(a => ({ mint: a.account.data.parsed.info.mint, amount: a.account.data.parsed.info.tokenAmount.uiAmount }))
    .filter(h => h.amount > 0);

  if (holdings.length > 0) {
    console.log(`\nToken holdings:`);
    for (const h of holdings) {
      const name = TOKEN_NAMES[h.mint] || h.mint.slice(0, 10) + '...';
      console.log(`  ${name.padEnd(16)} ${h.amount.toLocaleString()} tokens`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
