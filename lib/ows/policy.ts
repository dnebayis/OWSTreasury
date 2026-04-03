import type { PolicyCheckResult } from "@/types";
import { getAuditLogs, getWhitelist, getPolicySettings } from "@/lib/db";

/**
 * Policy Engine - validates transactions against configured rules.
 * Directly queries DB for the most up-to-date treasury rules.
 */
export class PolicyEngine {
  /**
   * Check a transaction against all policies
   */
  async check(params: {
    chain: string;
    to: string;
    amount: string;
    amountUSD?: number;
    transaction?: any;
  }): Promise<PolicyCheckResult> {
    const warnings: string[] = [];
    let allowed = true;

    // Safety guard
    if (!params.to) {
      return {
        allowed: false,
        reason: "Missing recipient address",
        warnings: ["Destination address is required for policy check"],
      };
    }

    // Force sync fetch for maximum reliability
    const [whitelistRows, settingsRows] = await Promise.all([
      getWhitelist(),
      getPolicySettings(),
    ]);

    // Create a settings map
    const settings = new Map();
    settingsRows.forEach((s: any) => settings.set(s.id, s));

    // 1. Whitelist Check
    const whitelistPolicy = settings.get("whitelist") || { is_enabled: false };
    if (whitelistPolicy.is_enabled) {
      const isWhitelisted = whitelistRows.some(
        (w: any) => w.address && w.address.toLowerCase() === params.to.toLowerCase()
      );
      
      if (!isWhitelisted) {
        allowed = false;
        warnings.push("Recipient address is not in the approved whitelist");
      }
    }

    // 2. Spending Limit
    const spendingPolicy = settings.get("spending-limit");
    if (spendingPolicy?.is_enabled && params.amountUSD) {
      const limit = spendingPolicy.value?.limitUSD || 100;
      if (params.amountUSD > limit) {
        allowed = false;
        warnings.push(`Daily spending limit exceeded ($${limit} max)`);
      }
    }

    // 3. Velocity Limit
    const velocityPolicy = settings.get("velocity-limit");
    if (velocityPolicy?.is_enabled) {
      const maxPerHour = velocityPolicy.value?.maxPerHour || 3;
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const logs = await getAuditLogs({ limit: 20 });
      const recentSigns = (logs || []).filter((l: any) => 
        l.operation === "sign" && 
        l.status === "approved" &&
        l.timestamp > hourAgo
      );
      if (recentSigns.length >= maxPerHour) {
        allowed = false;
        warnings.push(`Transaction frequency limit reached (Max ${maxPerHour} per hour)`);
      }
    }

    // 4. Testnet safety check (always active)
    const chain = params.chain ? params.chain.toLowerCase() : "unknown";
    const isTestnet =
      chain === "evm" || chain === "solana" ||
      chain.includes("sepolia") || chain.includes("devnet") ||
      chain.includes("testnet") || chain.includes("localhost");
    if (!isTestnet) {
      allowed = false;
      warnings.push(`Transactions are restricted to Testnets currently. (Detected: ${chain})`);
    }

    return {
      allowed,
      reason: allowed ? "All policies passed" : "Policy violation detected",
      warnings,
    };
  }

  async checkStrict(params: {
    chain: string;
    to: string;
    amount: string;
    amountUSD?: number;
    transaction?: any;
  }): Promise<PolicyCheckResult> {
    const result = await this.check(params);
    if (result.warnings.length > 0) result.allowed = false;
    return result;
  }
}

export const policyEngine = new PolicyEngine();
