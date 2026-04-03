import { z } from "zod";

/**
 * Tool definitions for Qwen AI agent
 * Compatible with OpenAI function calling format
 */

const BalanceSchema = z.object({
  walletName: z.string().describe("Name of the wallet"),
  chain: z.enum(["evm", "solana"]).describe("Blockchain chain"),
  tokenAddress: z
    .string()
    .optional()
    .describe("Optional ERC-20 token address (for EVM only)"),
});

const CreateWalletSchema = z.object({
  walletName: z.string().describe("Human-readable wallet name"),
  chains: z
    .array(z.enum(["evm", "solana"]))
    .describe("Array of chains to support ['evm', 'solana']"),
});

const SignTransactionSchema = z.object({
  walletName: z.string().describe("Name of wallet to sign with"),
  chain: z.enum(["evm", "solana"]).describe("Blockchain chain"),
  to: z.string().describe("Recipient address"),
  amount: z.string().describe("Amount in human units (e.g. '0.01')"),
  token: z
    .string()
    .optional()
    .default("ETH")
    .describe("Token symbol (ETH, SOL, USDC, etc.)"),
  requireApproval: z
    .boolean()
    .default(true)
    .describe("MUST be true for real transactions"),
});

const CheckPolicySchema = z.object({
  walletName: z.string().describe("Wallet name"),
  chain: z.string().describe("Blockchain chain"),
  to: z.string().describe("Recipient wallet address"),
  amount: z.string().describe("Amount to send"),
  amountUSD: z
    .number()
    .optional()
    .describe("Optional: USD value for policy checks"),
  transaction: z
    .any()
    .optional()
    .describe("Raw transaction object for analysis"),
});

const ListWalletsSchema = z.object({});

const TransactionHistorySchema = z.object({
  walletName: z.string().describe("Wallet name"),
  chain: z.string().describe("Blockchain chain"),
  limit: z
    .number()
    .optional()
    .default(10)
    .describe("Max number of transactions to return"),
});

const SimulateTransactionSchema = z.object({
  walletName: z.string().describe("Wallet name"),
  chain: z.enum(["evm", "solana"]).describe("Blockchain chain"),
  to: z.string().describe("Recipient address"),
  amount: z.string().describe("Amount in human units"),
  token: z
    .string()
    .optional()
    .default("ETH")
    .describe("Token symbol"),
});
const ListWhitelistSchema = z.object({});

const AddToWhitelistSchema = z.object({
  address: z.string().describe("Address to whitelist"),
  label: z.string().describe("Label for the address"),
  chain: z.enum(["evm", "solana"]).describe("Chain type"),
});

const RemoveFromWhitelistSchema = z.object({
  id: z.string().describe("ID of the whitelist entry to remove"),
});

const UpdatePolicySchema = z.object({
  id: z.string().describe("Policy ID (spending-limit, velocity-limit)"),
  isEnabled: z.boolean().describe("Whether the policy is enabled"),
  value: z.any().optional().describe("New policy settings values"),
});

/**
 * Tool definitions compatible with Qwen API
 */
export const TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "create_wallet",
      description:
        "Create a new OWS wallet with addresses for all supported chains (EVM, Solana). The wallet is encrypted and stored locally. Never exposes private keys.",
      parameters: {
        type: "object",
        properties: {
          walletName: {
            type: "string",
            description: "Human-readable wallet name (e.g. 'My Trading Wallet')",
          },
          chains: {
            type: "array",
            items: { type: "string", enum: ["evm", "solana"] },
            description: "Chains to support",
          },
        },
        required: ["walletName", "chains"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_balance",
      description: "Get the current balance of a wallet on a specific chain. Fetches live on-chain data.",
      parameters: {
        type: "object",
        properties: {
          walletName: {
            type: "string",
            description: "Wallet name",
          },
          chain: {
            type: "string",
            enum: ["evm", "solana"],
            description: "Blockchain",
          },
          tokenAddress: {
            type: "string",
            description: "Optional ERC-20 address (EVM only)",
          },
        },
        required: ["walletName", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_wallets",
      description: "List all wallets stored in the OWS vault with their addresses and chain support.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_policy",
      description:
        "Check if a transaction would pass the current OWS policy engine rules before attempting to sign.",
      parameters: {
        type: "object",
        properties: {
          walletName: {
            type: "string",
            description: "Wallet name",
          },
          chain: {
            type: "string",
            description: "Blockchain",
          },
          amount: {
            type: "string",
            description: "Transaction amount",
          },
          amountUSD: {
            type: "number",
            description: "Optional USD value",
          },
          transaction: {
            type: "object",
            description: "Raw transaction object",
          },
        },
        required: ["walletName", "chain", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sign_and_send_transaction",
      description:
        "Sign and broadcast a transaction using OWS. ALWAYS requires human approval before execution. Policy engine checks are enforced automatically.",
      parameters: {
        type: "object",
        properties: {
          walletName: {
            type: "string",
            description: "Wallet name",
          },
          chain: {
            type: "string",
            enum: ["evm", "solana"],
            description: "Blockchain",
          },
          to: {
            type: "string",
            description: "Recipient address",
          },
          amount: {
            type: "string",
            description: "Amount in human units",
          },
          token: {
            type: "string",
            description: "Token symbol",
          },
          requireApproval: {
            type: "boolean",
            description: "Must be true for real transactions",
          },
        },
        required: ["walletName", "chain", "to", "amount", "requireApproval"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "simulate_transaction",
      description:
        "Simulate a transaction to preview the outcome, gas cost, and potential issues WITHOUT signing or broadcasting.",
      parameters: {
        type: "object",
        properties: {
          walletName: {
            type: "string",
            description: "Wallet name",
          },
          chain: {
            type: "string",
            enum: ["evm", "solana"],
            description: "Blockchain",
          },
          to: {
            type: "string",
            description: "Recipient address",
          },
          amount: {
            type: "string",
            description: "Amount in human units",
          },
          token: {
            type: "string",
            description: "Token symbol",
          },
        },
        required: ["walletName", "chain", "to", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_transaction_history",
      description: "Get recent transaction history for a wallet from the local audit log and on-chain data.",
      parameters: {
        type: "object",
        properties: {
          walletName: {
            type: "string",
            description: "Wallet name",
          },
          chain: {
            type: "string",
            description: "Blockchain",
          },
          limit: {
            type: "number",
            description: "Max number of transactions (default 10)",
          },
        },
        required: ["walletName", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_whitelist",
      description: "List all whitelisted recipient addresses in the OWS Treasury.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_whitelist",
      description: "Add a new recipient address to the OWS Treasury whitelist to allow future transfers.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "The wallet address to whitelist" },
          label: { type: "string", description: "A descriptive label (e.g. 'Marketing Dept')" },
          chain: { type: "string", enum: ["evm", "solana"], description: "The blockchain network" },
        },
        required: ["address", "label", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_from_whitelist",
      description: "Remove an address from the OWS Treasury whitelist using its ID.",
      parameters: {
        type: "object",
        properties: { id: { type: "string", description: "The ID of the whitelist entry" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_policy_setting",
      description: "Update a global security policy guardrail (e.g. spending limit, sign frequency).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Policy ID (spending-limit, velocity-limit)" },
          isEnabled: { type: "boolean", description: "Toggle the rule on/off" },
          value: { type: "object", description: "Optional: New limit values (e.g. { limitUSD: 500 })" },
        },
        required: ["id", "isEnabled"],
      },
    },
  },
];

/**
 * Tool parameter validation schemas
 */
export const toolSchemas = {
  create_wallet: CreateWalletSchema,
  get_balance: BalanceSchema,
  list_wallets: ListWalletsSchema,
  check_policy: CheckPolicySchema,
  sign_and_send_transaction: SignTransactionSchema,
  simulate_transaction: SimulateTransactionSchema,
  get_transaction_history: TransactionHistorySchema,
  list_whitelist: ListWhitelistSchema,
  add_to_whitelist: AddToWhitelistSchema,
  remove_from_whitelist: RemoveFromWhitelistSchema,
  update_policy_setting: UpdatePolicySchema,
};

export type ToolName = keyof typeof toolSchemas;

export type ToolInput = Record<string, any>;

export interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required: string[];
    };
  };
}
