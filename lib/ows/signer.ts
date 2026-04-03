import { owsClient } from "./client";
import { policyEngine } from "./policy";
import type { Transaction, ChainType } from "@/types";
import { addAuditLog } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { buildUnsignedEVMTransaction, broadcastEVMTransaction } from "@/lib/chains/evm";

/**
 * Signing operations - integrates OWS with policy engine
 * Never exposes private keys - all signing delegated to OWS vault
 */
export class Signer {
  /**
   * Sign and broadcast a transaction
   * CRITICAL: Policy check MUST pass before this runs
   */
  async signAndSend(params: {
    walletName: string;
    chain: string;
    to: string;
    amount: string;
    token?: string;
    transaction: any;
    userApproved: boolean;
  }): Promise<{ hash: string; transaction: Transaction }> {
    const { walletName, chain, to, amount, token = "ETH", transaction, userApproved } = params;

    if (!userApproved) {
      throw new Error("Transaction requires user approval");
    }

    try {
      // Get wallet (combines verify + address lookup in one vault cycle)
      const wallet = await owsClient.getWallet(walletName);
      if (!wallet) {
        throw new Error(`Wallet '${walletName}' not found in vault`);
      }

      const isEVM = chain === "evm" || chain === "evm:sepolia";

      let txHash: string;
      let fromAddress: string;

      if (isEVM) {
        fromAddress = wallet.addresses.find((a) => a.chain === "evm")?.address || "";
        if (!fromAddress) throw new Error(`Wallet '${walletName}' has no EVM address`);

        // 1. Build unsigned transaction and serialize to hex for OWS
        const { unsignedTx, serializedHex } = await buildUnsignedEVMTransaction({
          from: fromAddress as `0x${string}`,
          to,
          amount,
        });

        // 2. OWS signs the serialized tx hex → returns 65-byte raw signature
        const signatureHex = await owsClient.signTransaction(walletName, chain, { hex: serializedHex });

        // 3. Attach signature and broadcast via viem → real tx hash
        txHash = await broadcastEVMTransaction(unsignedTx, signatureHex);
      } else {
        // Solana path — OWS handles end-to-end, returns signature
        fromAddress = wallet.addresses.find((a) => a.chain === "solana")?.address || "";
        txHash = await owsClient.signTransaction(walletName, chain, transaction);
      }

      // Create transaction record
      const txRecord: Transaction = {
        hash: txHash,
        chain: chain as any as ChainType,
        from: fromAddress,
        to,
        amount,
        token,
        status: "confirmed",
        timestamp: new Date().toISOString(),
      };

      // Update Audit Log
      await addAuditLog({
        id: uuidv4(),
        timestamp: txRecord.timestamp,
        walletName,
        chain: chain as any as ChainType,
        operation: "sign",
        status: "approved",
        txHash,
        amount,
        toAddress: to,
        userApproved: true,
      });

      return { hash: txHash, transaction: txRecord };
    } catch (error) {
      throw new Error(`Failed to sign and send transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a transaction would pass policy checks
   */
  async checkPolicy(params: {
    chain: string;
    to: string;
    amount: string;
    amountUSD?: number;
    transaction?: any;
  }) {
    return await policyEngine.check(params);
  }

  /**
   * Verify transaction before signing
   */
  async verifyTransaction(params: {
    walletName: string;
    chain: string;
    to: string;
    amount: string;
    transaction: any;
  }): Promise<{
    valid: boolean;
    error?: string;
  }> {
    const { walletName, chain, to, transaction } = params;

    try {
      // Verify wallet exists
      const wallet = await owsClient.getWallet(walletName);
      if (!wallet) {
        return { valid: false, error: `Wallet '${walletName}' not found` };
      }

      // Verify recipient address format
      if (!this.isValidAddress(to, chain)) {
        return { valid: false, error: `Invalid recipient address for ${chain}` };
      }

      // Verify transaction structure
      if (!transaction || typeof transaction !== "object") {
        return { valid: false, error: "Invalid transaction data" };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  /**
   * Validate address format by chain
   */
  private isValidAddress(address: string, chain: string): boolean {
    if (chain === "evm" || chain === "evm:sepolia") {
      // EVM: 0x + 40 hex chars
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    } else if (chain === "solana" || chain === "solana:devnet") {
      // Solana: base58, typically 32-44 chars
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    }
    return false;
  }
}

// Singleton instance
export const signer = new Signer();
