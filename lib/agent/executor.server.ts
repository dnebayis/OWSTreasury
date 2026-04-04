/**
 * Tool executor - SERVER ONLY
 * Use only in /api/agent route
 */

import { owsClient } from "@/lib/ows/client";
import { signer } from "@/lib/ows/signer";
import { getEVMBalance, simulateEVMTransaction } from "@/lib/chains/evm";
import { getSolanaBalance, simulateSolanaTransaction } from "@/lib/chains/solana";
import { addAuditLog, getAuditLogs, saveWallet } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import type { ToolName, ToolInput } from "@/lib/agent/tools";
import type { ToolResult, AuditLogEntry, ChainType } from "@/types";

export class ToolExecutor {
  async execute(toolName: ToolName, input: ToolInput): Promise<ToolResult> {
    try {
      switch (toolName) {
        case "create_wallet":
          return await this.createWallet(input);
        case "get_balance":
          return await this.getBalance(input);
        case "list_wallets":
          return await this.listWallets(input);
        case "check_policy":
          return await this.checkPolicy(input);
        case "sign_and_send_transaction":
          return await this.signAndSendTransaction(input);
        case "simulate_transaction":
          return await this.simulateTransaction(input);
        case "get_transaction_history":
          return await this.getTransactionHistory(input);
        case "list_whitelist":
          return await this.listWhitelist();
        case "add_to_whitelist":
          return await this.addToWhitelist(input);
        case "remove_from_whitelist":
          return await this.removeFromWhitelist(input);
        case "update_policy_setting":
          return await this.updatePolicySetting(input);
        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      console.error(`Tool error [${toolName}]:`, error);
      return { success: false, error: String(error) };
    }
  }

  private async createWallet(input: ToolInput): Promise<ToolResult> {
    const { walletName, chains } = input as { walletName: string; chains: string[] };
    const wallet = await owsClient.createWallet(walletName, []);

    // 1. Log the operation
    const firstChain = wallet.addresses[0]?.chain ?? "evm";
    await addAuditLog({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      walletName,
      chain: firstChain,
      operation: "create_wallet",
      status: "approved",
      userApproved: true,
    });

    // 2. Persist to DB
    await saveWallet(wallet);

    return {
      success: true,
      data: {
        name: wallet.name,
        addresses: wallet.addresses,
        createdAt: wallet.createdAt,
        message: `✅ Wallet created: ${wallet.name} and indexed in Treasury DB.`,
      },
    };
  }

  private async getBalance(input: ToolInput): Promise<ToolResult> {
    const { walletName, chain, tokenAddress } = input as {
      walletName: string;
      chain: string;
      tokenAddress?: string;
    };

    try {
      const wallet = await owsClient.getWallet(walletName);
      if (!wallet) return { success: false, error: `Wallet '${walletName}' not found` };

      const address = wallet.addresses.find((a) => a.chain === chain)?.address;
      if (!address) return { success: false, error: `No ${chain} address in wallet` };

      let balance: any;
      if (chain === "evm") {
        balance = await getEVMBalance(address, tokenAddress);
      } else if (chain === "solana") {
        balance = await getSolanaBalance(address);
      }

      return { success: true, data: balance };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async listWallets(input: ToolInput): Promise<ToolResult> {
    const wallets = await owsClient.listWallets();
    return { success: true, data: wallets };
  }

  private async checkPolicy(input: ToolInput): Promise<ToolResult> {
    const { walletName, chain, to, amount, amountUSD, transaction } = input as {
      walletName?: string;
      chain: string;
      to: string;
      amount: string;
      amountUSD?: number;
      transaction?: any;
    };

    const { policyEngine } = await import("@/lib/ows/policy");
    const result = await policyEngine.check({
      chain,
      to,
      amount,
      walletName,
      amountUSD,
      transaction,
    });

    return { success: true, data: result };
  }

  private async signAndSendTransaction(input: ToolInput): Promise<ToolResult> {
    const { walletName, chain, to, amount, token, requireApproval } = input as {
      walletName: string;
      chain: string;
      to: string;
      amount: string;
      token: string;
      requireApproval: boolean;
    };

    try {
      const result = await signer.signAndSend({
        walletName,
        chain,
        to,
        amount,
        token,
        transaction: {}, 
        userApproved: requireApproval,
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Signing failed" };
    }
  }

  private async simulateTransaction(input: ToolInput): Promise<ToolResult> {
    const { chain, to, amount, token } = input as {
      chain: string;
      to: string;
      amount: string;
      token: string;
    };

    let result: any;
    if (chain === "evm") {
      result = await simulateEVMTransaction({ to, amount, token });
    } else if (chain === "solana") {
      result = await simulateSolanaTransaction({ to, amount, token });
    }

    const { policyEngine } = await import("@/lib/ows/policy");
    const policyResult = await policyEngine.check({
      chain,
      to,
      amount,
    });

    return {
      success: true,
      data: { simulation: result, policy: policyResult },
    };
  }

  private async getTransactionHistory(input: ToolInput): Promise<ToolResult> {
    const { walletName, chain, limit } = input as {
      walletName: string;
      chain: string;
      limit?: number;
    };

    const logs = await getAuditLogs({ walletName, chain, limit });
    return { success: true, data: logs };
  }

  private async listWhitelist(): Promise<ToolResult> {
    try {
      const { getWhitelist } = await import("@/lib/db");
      const whitelist = await getWhitelist();
      return { success: true, data: whitelist };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async addToWhitelist(input: ToolInput): Promise<ToolResult> {
    const { address, label, chain } = input as {
      address: string;
      label: string;
      chain: string;
    };

    try {
      const { addWhitelistAddress } = await import("@/lib/db");
      const res = await addWhitelistAddress({ address, label, chain });
      return {
        success: true,
        data: { message: `✅ Added to whitelist: ${label} (${address})`, entry: res },
      };
    } catch (error) {
       return { success: false, error: String(error) };
    }
  }

  private async removeFromWhitelist(input: ToolInput): Promise<ToolResult> {
    const { id } = input as { id: string };
    try {
      const { removeWhitelistAddress } = await import("@/lib/db");
      await removeWhitelistAddress(id);
      return { success: true, data: { message: "✅ Removed from whitelist" } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async updatePolicySetting(input: ToolInput): Promise<ToolResult> {
    const { id, isEnabled, value } = input as {
      id: string;
      isEnabled: boolean;
      value?: any;
    };

    try {
      const { updatePolicySetting } = await import("@/lib/db");
      await updatePolicySetting(id, isEnabled, value);
      return {
        success: true,
        data: { message: `✅ Security policy '${id}' updated.` },
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

export const toolExecutor = new ToolExecutor();
