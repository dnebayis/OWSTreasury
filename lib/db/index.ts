import { createClient } from "@supabase/supabase-js";
import type { AuditLogEntry } from "@/types";

const supabaseUrl = 
  process.env.SUPABASE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  "";

const supabaseAnonKey = 
  process.env.SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
  "";

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);

/**
 * --- Audit Logs ---
 */
export async function addAuditLog(entry: AuditLogEntry): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("audit_logs").insert([{
      id: entry.id,
      timestamp: entry.timestamp,
      wallet_name: entry.walletName,
      chain: entry.chain,
      operation: entry.operation,
      status: entry.status,
      tx_hash: entry.txHash || null,
      amount: entry.amount || null,
      to_address: entry.toAddress || null,
      policy_result: entry.policyResult || null,
      user_approved: entry.userApproved || false,
    }]);
    if (error) console.error("Audit log error:", error.message);
  } catch (err) {
    console.error("DB error in addAuditLog:", err);
  }
}

export async function getAuditLogs(options?: any) {
  if (!supabase) return [];
  try {
    let query = supabase.from("audit_logs").select("*").order("timestamp", { ascending: false });
    if (options?.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    return data || [];
  } catch {
    return [];
  }
}

/**
 * --- Whitelist & Policies ---
 */
export async function getWhitelist() {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("whitelist_addresses").select("*");
    return data || [];
  } catch {
    return [];
  }
}

export async function addWhitelistAddress(params: { address: string; label: string; chain: string }) {
  if (!supabase) throw new Error("Supabase not connected");
  const { data, error } = await supabase.from("whitelist_addresses").insert([params]).select();
  if (error) throw error;
  return data[0];
}

export async function removeWhitelistAddress(id: string) {
  if (!supabase) return;
  await supabase.from("whitelist_addresses").delete().eq("id", id);
}

export async function getPolicySettings() {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("policy_settings").select("*");
    return data || [];
  } catch {
    return [];
  }
}

export async function updatePolicySetting(id: string, isEnabled: boolean, value?: any) {
  if (!supabase) return;
  const updates: any = { is_enabled: isEnabled, updated_at: new Date().toISOString() };
  if (value !== undefined) updates.value = value;
  await supabase.from("policy_settings").update(updates).eq("id", id);
}

/**
 * --- Chat History ---
 */
export async function saveChatMessage(message: { id: string; role: string; content: string; toolCalls?: any[] }) {
  if (!supabase) return;
  try {
    await supabase.from("chat_messages").upsert([{
      id: message.id,
      role: message.role,
      content: message.content,
      tool_calls: message.toolCalls || [],
      timestamp: new Date().toISOString()
    }]);
  } catch (err) {
    console.error("Failed to save chat message:", err);
  }
}

export async function getChatMessages(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from("chat_messages").select("*").order("timestamp", { ascending: true });
    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      toolCalls: row.tool_calls,
      timestamp: row.timestamp
    }));
  } catch {
    return [];
  }
}

/**
 * --- Wallets ---
 */
export async function saveWallet(wallet: { name: string; addresses: any[] }) {
  if (!supabase) return;
  try {
    await supabase.from("wallets").upsert([{
      name: wallet.name,
      addresses: wallet.addresses
    }], { onConflict: 'name' });
  } catch (err) {
    console.error("Failed to save wallet:", err);
  }
}

export async function getWallets() {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("wallets").select("*");
    return data || [];
  } catch {
    return [];
  }
}

/**
 * --- Vault Data (Encrypted JSONs) ---
 */
export async function saveVaultData(name: string, content: string) {
  if (!supabase) return;
  await supabase.from("vault_data").upsert([{
    name,
    encrypted_blob: content
  }], { onConflict: 'name' });
}

export async function getVaultData(name: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("vault_data").select("encrypted_blob").eq("name", name).single();
  return data?.encrypted_blob || null;
}

export async function listVaultNames(): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("vault_data").select("name");
  return (data || []).map((d: { name: string }) => d.name);
}
