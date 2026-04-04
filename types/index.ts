// Type definitions for OWS Treasury Agent

export type ChainType = "evm" | "solana";

export interface WalletAddress {
  chain: ChainType;
  address: string;
}

export interface Wallet {
  name: string;
  addresses: WalletAddress[];
  createdAt: string;
}

export interface Balance {
  chain: ChainType;
  token: string;
  amount: string;
  usdValue?: string;
}

export interface Transaction {
  hash: string;
  chain: ChainType;
  from: string;
  to: string;
  amount: string;
  token: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: string;
  gasUsed?: string;
}

export interface TransactionSimulation {
  success: boolean;
  gasEstimate: string;
  gasPrice: string;
  totalCost: string;
  balanceAfter: string;
  error?: string;
}

export interface PolicyCheckResult {
  allowed: boolean;
  reason: string;
  warnings: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  walletName: string;
  chain: ChainType;
  operation: "sign" | "simulate" | "policy_check" | "balance_check" | "create_wallet";
  status: "approved" | "rejected" | "pending" | "failed";
  txHash?: string;
  amount?: string;
  toAddress?: string;
  policyResult?: PolicyCheckResult;
  userApproved: boolean;
  created_at?: string;
}

export interface ToolInput {
  [key: string]: any;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  input: ToolInput;
  output?: ToolResult;
  status: "pending" | "completed" | "failed";
}
