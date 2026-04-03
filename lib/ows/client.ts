import fs from "fs/promises";
import path from "path";
import os from "os";
import type { Wallet, WalletAddress } from "@/types";
import { saveVaultData, getVaultData, listVaultNames } from "@/lib/db";

// Use /tmp on Vercel serverless, home dir locally
const VAULT_PATH = process.env.VERCEL
  ? path.join("/tmp", ".ows", "wallets")
  : path.join(os.homedir(), ".ows", "wallets");

// Lazy-load OWS to avoid bundler issues
let _ows: typeof import("@open-wallet-standard/core") | null = null;
async function ows() {
  if (!_ows) _ows = await import("@open-wallet-standard/core");
  return _ows;
}

function mapAccounts(accounts: Array<{ chainId: string; address: string }>): WalletAddress[] {
  return accounts.map((a) => ({
    chain: a.chainId.startsWith("eip155") ? "evm" : "solana",
    address: a.address,
  }));
}

export class OWSClient {
  private async withTransientVault<T>(
    operation: (vaultPath: string) => Promise<T>,
    namesToRestore: string[] = []
  ): Promise<T> {
    await fs.mkdir(VAULT_PATH, { recursive: true });

    try {
      // Restore from Supabase
      for (const name of namesToRestore) {
        const content = await getVaultData(name);
        if (content) {
          await fs.writeFile(path.join(VAULT_PATH, `${name}.json`), content);
        }
      }

      const result = await operation(VAULT_PATH);

      // Sync new/changed files back to Supabase
      const files = await fs.readdir(VAULT_PATH);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = await fs.readFile(path.join(VAULT_PATH, file), "utf-8");
          const name = file.replace(".json", "");
          await saveVaultData(name, content);

          const saved = await getVaultData(name);
          if (!saved) {
            throw new Error(
              `Supabase sync failed for wallet '${name}'. ` +
              `Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.`
            );
          }
        }
      }

      return result;
    } finally {
      // Purge local files
      try {
        const files = await fs.readdir(VAULT_PATH);
        for (const file of files) {
          if (file.endsWith(".json")) {
            await fs.rm(path.join(VAULT_PATH, file), { force: true });
          }
        }
      } catch { /* ignore purge errors */ }
    }
  }

  async createWallet(walletName: string, _chains: string[]): Promise<Wallet> {
    const lib = await ows();
    return this.withTransientVault(async (vaultPath) => {
      const info = lib.createWallet(walletName, undefined, undefined, vaultPath);
      return {
        name: info.name,
        addresses: mapAccounts(info.accounts),
        createdAt: info.createdAt,
      };
    });
  }

  async listWallets(): Promise<Wallet[]> {
    const lib = await ows();
    const allNames = await listVaultNames();
    return this.withTransientVault(async (vaultPath) => {
      const infos = lib.listWallets(vaultPath);
      return infos.map((info) => ({
        name: info.name,
        addresses: mapAccounts(info.accounts),
        createdAt: info.createdAt,
      }));
    }, allNames);
  }

  async getWallet(walletName: string): Promise<Wallet | null> {
    const lib = await ows();
    const allNames = await listVaultNames();
    return this.withTransientVault(async (vaultPath) => {
      try {
        const info = lib.getWallet(walletName, vaultPath);
        return {
          name: info.name,
          addresses: mapAccounts(info.accounts),
          createdAt: info.createdAt,
        };
      } catch {
        return null;
      }
    }, allNames);
  }

  async signTransaction(walletName: string, chain: string, txData: any): Promise<string> {
    const lib = await ows();
    const allNames = await listVaultNames();
    return this.withTransientVault(async (vaultPath) => {
      const txHex = typeof txData === "string" ? txData : txData.hex || "";
      const result = lib.signTransaction(walletName, chain, txHex, undefined, undefined, vaultPath);
      return result.signature;
    }, allNames);
  }

  async verifyWallet(walletName: string): Promise<boolean> {
    try {
      const wallet = await this.getWallet(walletName);
      return wallet !== null;
    } catch {
      return false;
    }
  }
}

export const owsClient = new OWSClient();
