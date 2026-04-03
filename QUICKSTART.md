# Quick Start — OWS Treasury Agent

## 5-Minute Setup

### Step 1 — Install dependencies

```bash
cd ows-treasury-agent
pnpm install
```

### Step 2 — Create Supabase tables

Open your Supabase project → **SQL Editor** → Run:

```sql
create table vault_data (
  name text primary key,
  encrypted_blob text not null
);
create table wallets (
  name text primary key,
  addresses jsonb not null,
  created_at timestamptz default now()
);
create table audit_logs (
  id uuid primary key,
  timestamp timestamptz not null,
  wallet_name text, chain text, operation text, status text,
  tx_hash text, amount text, to_address text,
  policy_result jsonb, user_approved boolean default false
);
create table whitelist_addresses (
  id uuid primary key default gen_random_uuid(),
  address text not null, label text, chain text not null
);
create table policy_settings (
  id text primary key, name text not null,
  value jsonb, is_enabled boolean default false,
  updated_at timestamptz default now()
);
create table chat_messages (
  id uuid primary key, role text not null,
  content text not null, tool_calls jsonb,
  timestamp timestamptz default now()
);

insert into policy_settings (id, name, value, is_enabled) values
  ('spending-limit', 'Daily Spending Limit', '{"limitUSD": 100}', false),
  ('velocity-limit', 'Velocity Limit', '{"maxPerHour": 3}', false);
```

### Step 3 — Configure `.env.local`

```bash
QWEN_API_KEY=sk-...
QWEN_API_BASE=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-max

NEXT_PUBLIC_EVM_RPC=https://sepolia.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

OWS_VAULT_PATH=~/.ows/wallets
```

### Step 4 — Install & init OWS CLI

```bash
npm install -g @open-wallet-standard/core
ows init --vault ~/.ows/wallets
```

### Step 5 — Run

```bash
pnpm dev
# → http://localhost:3000
```

---

## Test Flows

### ✅ Create a wallet
```
"Create a new wallet called treasury-main"
→ Agent calls create_wallet → OWS CLI generates addresses → Saved to Supabase
```

### ✅ Check balance
```
"What's my ETH balance on treasury-main?"
→ Agent calls get_balance → Live Sepolia RPC call → Shows balance
```

### ✅ Simulate a transaction
```
"Simulate sending 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f742Dd"
→ simulate_transaction → check_policy → Shows gas estimate + policy result
```

### ✅ Send with approval
```
"Send 0.001 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f742Dd"
→ Simulate → Policy check → TransactionCard appears
→ Click "Authorize & Sign" → OWS signs → tx hash returned
```

### ✅ Manage whitelist via chat
```
"Add 0x742d35Cc6634C0532925a3b844Bc9e7595f742Dd to whitelist as 'Test Address'"
→ Agent calls add_to_whitelist → Saved to Supabase whitelist_addresses
```

### ✅ Configure policies via Policy Admin
```
Click "Policy" in header → Policy Admin panel
→ Toggle spending-limit ON → Edit limit from $100 → Save
→ Toggle velocity-limit ON → Edit from 3/hour → Save
```

---

## Get Testnet Funds

**Ethereum Sepolia**: https://sepoliafaucet.com

**Solana Devnet**:
```bash
solana airdrop 2 YOUR_SOLANA_ADDRESS --url https://api.devnet.solana.com
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Wallet not found" | `ows init --vault ~/.ows/wallets` |
| Policy always blocks | Run SQL seed for `policy_settings` (Step 2) |
| Supabase writes silently fail | Check `NEXT_PUBLIC_SUPABASE_URL` and `ANON_KEY` |
| Qwen API error | Verify `QWEN_API_KEY` and `QWEN_API_BASE` |
| No wallets showing | Tables may not exist — run Step 2 SQL |

---

> See `README.md` for full architecture diagrams and API reference.
