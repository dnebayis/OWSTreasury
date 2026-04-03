import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import type { Wallet, WalletAddress } from "@/types";
import { saveVaultData, getVaultData, listVaultNames } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

// Standard OWS vault location
const GLOBAL_VAULT_PATH = path.join(os.homedir(), ".ows", "wallets");

/**
 * OWS SDK wrapper - Stateless & Cloud-Native
 * Uses the default OWS path transiently and purges after every operation.
 */
export class OWSClient {
  private async withTransientVault<T>(
    operation: () => Promise<T>,
    namesToRestore: string[] = []
  ): Promise<T> {
    // 1. Ensure directory exists
    await fs.mkdir(GLOBAL_VAULT_PATH, { recursive: true });

    try {
      // 2. Restore from Supabase
      for (const name of namesToRestore) {
        const content = await getVaultData(name);
        if (content) {
          await fs.writeFile(path.join(GLOBAL_VAULT_PATH, `${name}.json`), content);
        }
      }

      // 3. Execute OWS CLI
      const result = await operation();

      // 4. Sync new/changed data back to Supabase — verify before purging
      const files = await fs.readdir(GLOBAL_VAULT_PATH);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = await fs.readFile(path.join(GLOBAL_VAULT_PATH, file), "utf-8");
          const name = file.replace(".json", "");
          await saveVaultData(name, content);

          // Verify the save actually landed — abort purge if not
          const saved = await getVaultData(name);
          if (!saved) {
            throw new Error(
              `Supabase sync failed for wallet '${name}'. ` +
              `Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, ` +
              `and ensure the vault_data table exists.`
            );
          }
        }
      }

      return result;
    } finally {
      // 5. PURGE ALL LOCAL JSON FILES IMMEDIATELY
      const files = await fs.readdir(GLOBAL_VAULT_PATH);
      for (const file of files) {
        if (file.endsWith(".json")) {
          await fs.rm(path.join(GLOBAL_VAULT_PATH, file), { force: true });
        }
      }
    }
  }

  async createWallet(walletName: string, _chains: string[]): Promise<Wallet> {
    return this.withTransientVault(async () => {
      const { stdout } = await execAsync(`ows wallet create --name "${walletName}"`);
      const addresses = this.parseWalletOutput(stdout);
      return { name: walletName, addresses, createdAt: new Date().toISOString() };
    });
  }

  async listWallets(): Promise<Wallet[]> {
    const allNames = await listVaultNames();
    return this.withTransientVault(async () => {
      const { stdout } = await execAsync(`ows wallet list`);
      return this.parseListOutput(stdout);
    }, allNames);
  }

  async getWallet(walletName: string): Promise<Wallet | null> {
    const wallets = await this.listWallets();
    return wallets.find((w) => w.name === walletName) || null;
  }

  async signTransaction(walletName: string, chain: string, txData: any): Promise<string> {
    // Restore ALL vault files so OWS CLI can locate the wallet by name
    const allNames = await listVaultNames();

    return this.withTransientVault(async () => {
      let txHex = typeof txData === "string" ? txData : txData.hex || "";
      const { stdout } = await execAsync(
        `ows sign tx --wallet "${walletName}" --chain ${chain} --tx "${txHex}"`
      );
      return stdout.trim();
    }, allNames);
  }

  async verifyWallet(walletName: string): Promise<boolean> {
    // Check by running ows wallet list — vault filenames ≠ wallet names (CLI uses internal IDs)
    try {
      const wallets = await this.listWallets();
      return wallets.some((w) => w.name === walletName);
    } catch {
      return false;
    }
  }

  private parseListOutput(output: string): Wallet[] {
    const wallets: Wallet[] = [];
    const sections = output.split(/^ID:\s+/m).filter(s => s.trim());

    for (const section of sections) {
      const nameMatch = section.match(/^Name:\s+(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim() : "Unknown";
      const addresses: WalletAddress[] = [];
      const lines = section.split("\n");
      for (const line of lines) {
        if (line.includes("→")) {
          const parts = line.split("→");
          const chainPart = parts[0].trim();
          const address = parts[1].trim();
          if (chainPart.startsWith("eip155")) addresses.push({ chain: "evm", address });
          else if (chainPart.startsWith("solana")) addresses.push({ chain: "solana", address });
        }
      }
      wallets.push({ name, addresses, createdAt: new Date().toISOString() });
    }
    return wallets;
  }

  private parseWalletOutput(output: string): WalletAddress[] {
    const addresses: WalletAddress[] = [];
    const lines = output.split("\n");
    for (const line of lines) {
      if (line.includes("→")) {
        const parts = line.split("→");
        const chainPart = parts[0].trim();
        const address = parts[1].trim();
        if (chainPart.startsWith("eip155")) addresses.push({ chain: "evm", address });
        else if (chainPart.startsWith("solana")) addresses.push({ chain: "solana", address });
      }
    }
    return addresses;
  }
}

export const owsClient = new OWSClient();
