# OWS Treasury Agent — Implementation Summary

## Status

| Area | Status | Notes |
|------|--------|-------|
| OWS vault integration | ✅ | Cloud-native transient pattern |
| Qwen AI agent (11 tools) | ✅ | OpenAI-compatible function calling |
| Transaction approval flow | ✅ | Client-side TransactionCard, no auto-sign |
| Policy engine | ✅ | Supabase-backed, 4 policy types |
| Policy Admin UI | ✅ | Whitelist, guardrails, audit log |
| Markdown rendering | ✅ | Tables, code, bold, lists in AI responses |
| Chat history persistence | ✅ | Supabase chat_messages |
| Audit logging | ✅ | Supabase audit_logs |
| EVM (Sepolia) | ✅ | viem, live balance + simulation |
| Solana (Devnet) | ✅ | @solana/web3.js |
| DB schema | ⚠️ | Must be created in Supabase manually |

---

## Architecture

### Request Flow

```mermaid
flowchart TD
    User(["👤 User"])
    Chat["Chat UI"]
    Agent["/api/agent\nQwen streaming"]
    Executor["Tool Executor"]
    Policy["Policy Engine"]
    OWS["OWS Client\n(CLI wrapper)"]
    EVM["viem\nSepolia RPC"]
    SOL["web3.js\nDevnet RPC"]
    DB[("Supabase")]
    LocalVault["~/.ows/wallets\nTransient"]
    SignAPI["/api/wallet/sign"]

    User -->|"Message"| Chat
    Chat -->|"POST NDJSON stream"| Agent
    Agent -->|"Tool call"| Executor
    Executor --> Policy & OWS & EVM & SOL & DB
    OWS <--> LocalVault
    LocalVault <-->|"encrypt/sync"| DB
    Agent -->|"pending_approval"| Chat
    Chat -->|"Authorize click"| SignAPI
    SignAPI --> Executor
```

### Transaction Signing Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Chat UI
    participant AG as Qwen Agent
    participant PE as Policy Engine
    participant OWS as OWS Vault

    User->>UI: "Send 0.01 ETH to 0x..."
    UI->>AG: POST /api/agent
    AG->>AG: simulate_transaction
    AG->>PE: check_policy(chain, to, amount)
    PE-->>AG: { allowed: true }
    Note over AG: sign_and_send_transaction intercepted
    AG-->>UI: pending_approval event
    UI-->>User: TransactionCard (from/to/amount/gas)
    User->>UI: "Authorize & Sign"
    UI->>OWS: POST /api/wallet/sign
    OWS->>OWS: ows sign tx --wallet ... --chain ...
    Note over OWS: Private key never leaves vault
    OWS-->>UI: { hash: "0x..." }
    UI-->>User: ✅ Transaction confirmed
```

### Storage Architecture

```mermaid
flowchart LR
    subgraph Supabase["Supabase (Persistent)"]
        VD["vault_data\nname | encrypted_blob"]
        WA["wallets\nname | addresses"]
        AL["audit_logs\nall operations"]
        WL["whitelist_addresses\naddress | label | chain"]
        PS["policy_settings\nid | value | is_enabled"]
        CM["chat_messages\nrole | content | tool_calls"]
    end

    subgraph OWSFlow["OWS Vault Flow (Transient)"]
        direction TB
        S1["1. Restore from Supabase"] --> S2["2. Write to ~/.ows/"]
        S2 --> S3["3. Run OWS CLI"]
        S3 --> S4["4. Sync back to Supabase"]
        S4 --> S5["5. Purge local files"]
    end

    VD <--> OWSFlow
```

---

## File Structure

```
ows-treasury-agent/
├── app/
│   ├── layout.tsx                    # Root layout (dark mode, fonts)
│   ├── globals.css                   # Theme, markdown styles, scrollbar
│   ├── page.tsx                      # Entry point → ChatWindow
│   ├── dashboard/page.tsx            # Standalone wallet dashboard
│   └── api/
│       ├── agent/route.ts            # Qwen streaming, intercepts sign calls
│       ├── summary/route.ts          # Dashboard stats
│       └── wallet/
│           ├── create/route.ts
│           ├── list/route.ts
│           ├── balance/route.ts
│           └── sign/route.ts         # Executes approved signing
├── lib/
│   ├── ows/
│   │   ├── client.ts                 # Cloud-native OWS CLI wrapper
│   │   ├── signer.ts                 # signAndSend + policy integration
│   │   └── policy.ts                 # 4-rule policy engine
│   ├── agent/
│   │   ├── tools.ts                  # 11 Zod-validated tool definitions
│   │   ├── executor.server.ts        # Tool execution logic
│   │   └── prompts.ts                # Qwen system prompt (all 11 tools listed)
│   ├── chains/
│   │   ├── evm.ts                    # viem: balance + simulation
│   │   └── solana.ts                 # web3.js: balance + simulation
│   ├── db/
│   │   ├── index.ts                  # Supabase client + all table operations
│   │   └── server.ts                 # Stub (SQLite removed)
│   └── utils.ts
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx            # Main interface: header, messages, input
│   │   ├── MessageBubble.tsx         # User/assistant bubbles with markdown
│   │   ├── MarkdownContent.tsx       # Lightweight markdown renderer
│   │   ├── ToolCallCard.tsx          # Collapsible tool inspector
│   │   ├── TransactionCard.tsx       # Approval UI (Authorize / Terminate)
│   │   └── SimulationDiff.tsx        # Before/after balance visualizer
│   ├── dashboard/
│   │   ├── DashboardSummary.tsx      # Compact 4-stat header bar
│   │   └── PolicyConfig.tsx          # Whitelist + guardrails + audit log
│   └── ui/                           # shadcn/ui components
├── store/
│   └── chatStore.ts                  # Zustand: messages, sync, initialize
└── types/
    └── index.ts                      # All shared TypeScript types
```

---

## Agent Tools

| # | Tool | Purpose | Key Input |
|---|------|---------|-----------|
| 1 | `create_wallet` | Generate OWS vault | walletName |
| 2 | `list_wallets` | Show all vaults | — |
| 3 | `get_balance` | Live on-chain balance | walletName, chain |
| 4 | `simulate_transaction` | Gas estimate | chain, to, amount |
| 5 | `check_policy` | Policy gate | chain, to, amount |
| 6 | `sign_and_send_transaction` | Triggers approval UI | walletName, chain, to, amount |
| 7 | `get_transaction_history` | Audit log query | walletName, chain, limit |
| 8 | `list_whitelist` | Show approved addresses | — |
| 9 | `add_to_whitelist` | Add trusted address | address, label, chain |
| 10 | `remove_from_whitelist` | Remove by ID | id |
| 11 | `update_policy_setting` | Toggle/configure guardrail | id, isEnabled, value |

---

## Policy Engine Rules

Evaluated in order before every transaction:

```
1. Testnet Only (hardcoded, always ON)
   → Deny if chain is not evm/solana/sepolia/devnet

2. Whitelist (Supabase-backed, default OFF)
   → Deny if recipient not in whitelist_addresses

3. Daily Spending Limit (Supabase-backed, default OFF)
   → Deny if amountUSD > limitUSD (default $100)

4. Velocity Limit (Supabase-backed, default OFF)
   → Deny if signs in last hour ≥ maxPerHour (default 3)
```

---

## Supabase Schema

Run in Supabase SQL Editor before first use:

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

---

## Security Checklist

- ✅ Private keys never leave OWS vault
- ✅ `sign_and_send_transaction` intercepted server-side — client must approve
- ✅ Policy engine runs before approval card is shown
- ✅ Testnet-only hardcoded (cannot be disabled)
- ✅ All operations recorded in audit_logs
- ✅ No secrets in client-side code (Supabase anon key is safe by design)
- ✅ TypeScript strict mode throughout

---

## Known Limitations

| Item | Status |
|------|--------|
| ENS name resolution | Not implemented |
| Token price feed (USD) | Not implemented — amountUSD must be passed manually |
| ERC-20 token balances | Stub returns 0 |
| Solana simulation | Stub — real fee estimation not wired |
| Mainnet support | Blocked by policy (testnet only) |
| Hardware wallet | Not planned |
