"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Plus, Trash2, X, AlertCircle, RefreshCcw, CheckCircle2, Lock, DollarSign, Zap, Clock } from "lucide-react";
import { getWhitelist, addWhitelistAddress, removeWhitelistAddress, getPolicySettings, updatePolicySetting, getAuditLogs } from "@/lib/db";

interface WhitelistEntry {
  id: string;
  address: string;
  label: string;
  chain: string;
}

interface PolicySetting {
  id: string;
  name: string;
  value: any;
  is_enabled: boolean;
}

// Default policies shown when DB has no rows
const DEFAULT_POLICIES: PolicySetting[] = [
  { id: "spending-limit", name: "spending-limit", value: { limitUSD: 100 }, is_enabled: false },
  { id: "velocity-limit", name: "velocity-limit", value: { maxPerHour: 3 }, is_enabled: false },
];

export default function PolicyConfig({ onClose }: { onClose?: () => void }) {
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [settings, setSettings] = useState<PolicySetting[]>(DEFAULT_POLICIES);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newChain, setNewChain] = useState("evm");
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  async function loadData() {
    setIsSyncing(true);
    try {
      const [w, s, logs] = await Promise.all([getWhitelist(), getPolicySettings(), getAuditLogs({ limit: 5 })]);
      setWhitelist(w);
      // Merge DB settings with defaults — always show all policy types
      const merged = DEFAULT_POLICIES.map((def) => {
        const fromDb = s.find((r: any) => r.id === def.id);
        return fromDb ?? def;
      });
      setSettings(merged);
      setAuditLogs(logs);
    } catch (err) {
      console.error("Failed to load policy data:", err);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddWhitelist() {
    if (!newAddress.trim()) return;
    try {
      await addWhitelistAddress({ address: newAddress.trim(), label: newLabel.trim() || "Untitled", chain: newChain });
      setNewAddress("");
      setNewLabel("");
      loadData();
    } catch (err) {
      console.error("Whitelist add error:", err);
      alert(`Failed to add address: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleRemoveWhitelist(id: string) {
    try {
      await removeWhitelistAddress(id);
      loadData();
    } catch {
      alert("Failed to remove address");
    }
  }

  async function handleTogglePolicy(policy: PolicySetting) {
    try {
      await updatePolicySetting(policy.id, !policy.is_enabled, policy.value);
      loadData();
    } catch {
      alert("Failed to update policy");
    }
  }

  async function handleSavePolicyValue(policy: PolicySetting) {
    const numVal = parseFloat(editValue);
    if (isNaN(numVal) || numVal <= 0) return;
    const newValue =
      policy.id === "spending-limit"
        ? { limitUSD: numVal }
        : { maxPerHour: Math.round(numVal) };
    try {
      await updatePolicySetting(policy.id, policy.is_enabled, newValue);
      setEditingPolicy(null);
      loadData();
    } catch {
      alert("Failed to save policy value");
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-mono">FETCHING SECURITY RULES...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Security Policies</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isSyncing}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            Sync
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Whitelist Management */}
        <Card className="bg-card/50 border-primary/10 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Address Whitelist
            </CardTitle>
            <CardDescription className="text-xs">
              When enabled, only approved addresses can receive treasury transfers.
              <span className="block mt-1 text-amber-400/80">
                {whitelist.length === 0 ? "No addresses — whitelist policy is currently disabled." : `${whitelist.length} approved address${whitelist.length > 1 ? "es" : ""}.`}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  placeholder="0x... or Solana address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddWhitelist()}
                  className="bg-background/50 h-10"
                />
                <Button onClick={handleAddWhitelist} disabled={!newAddress.trim()} className="h-10 shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Label (e.g. Finance Dept)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="bg-background/50 h-8 text-xs flex-1"
                />
                <select
                  value={newChain}
                  onChange={(e) => setNewChain(e.target.value)}
                  className="h-8 bg-background/50 border border-input rounded-md text-[10px] px-2 outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="evm">EVM</option>
                  <option value="solana">Solana</option>
                </select>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {whitelist.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8 font-mono border border-dashed rounded-lg border-border/50">
                  VAULT IS EMPTY
                </div>
              ) : (
                whitelist.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/30 group hover:border-primary/20 transition-all">
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="text-xs font-bold flex items-center gap-2">
                        {entry.label || "Untitled"}
                        <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0">{entry.chain}</Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[220px]">{entry.address}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-destructive h-8 w-8 shrink-0"
                      onClick={() => handleRemoveWhitelist(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Policy Guardrails */}
        <Card className="bg-card/50 border-primary/10 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Policy Guardrails
            </CardTitle>
            <CardDescription className="text-xs">Configurable rules enforced before every transaction.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hardcoded: Testnet Only */}
            <div className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-background/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      Testnet Only
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    </div>
                    <div className="text-[11px] text-muted-foreground">Deny all mainnet transactions — Sepolia &amp; Devnet only</div>
                  </div>
                </div>
                <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 text-[10px]">ALWAYS ON</Badge>
              </div>
            </div>

            {/* Dynamic: Spending Limit + Velocity Limit */}
            {settings.map((policy) => {
              const isSpending = policy.id === "spending-limit";
              const Icon = isSpending ? DollarSign : Clock;
              const currentVal = isSpending ? policy.value?.limitUSD ?? 100 : policy.value?.maxPerHour ?? 3;
              const label = isSpending ? "Daily Spending Limit" : "Velocity Limit";
              const desc = isSpending
                ? `Deny if daily volume > $${currentVal}`
                : `Deny if > ${currentVal} signs per hour`;

              return (
                <div key={policy.id} className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-background/20 hover:bg-background/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 shrink-0 ${policy.is_enabled ? "text-amber-400" : "text-muted-foreground"}`} />
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          {label}
                          {policy.is_enabled && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{desc}</div>
                      </div>
                    </div>
                    <Button
                      variant={policy.is_enabled ? "default" : "outline"}
                      size="sm"
                      className={`h-7 text-[10px] px-3 font-bold transition-all shrink-0 ${policy.is_enabled ? "bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : ""}`}
                      onClick={() => handleTogglePolicy(policy)}
                    >
                      {policy.is_enabled ? "ACTIVE" : "DISABLED"}
                    </Button>
                  </div>

                  {/* Inline value editor */}
                  {editingPolicy === policy.id ? (
                    <div className="flex gap-2 items-center mt-1">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder={String(currentVal)}
                        className="h-8 text-xs bg-background/50 flex-1"
                        min={1}
                      />
                      <Button size="sm" className="h-8 text-xs px-3" onClick={() => handleSavePolicyValue(policy)}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs px-3" onClick={() => setEditingPolicy(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <button
                      className="text-[10px] text-primary/60 hover:text-primary text-left font-mono transition-colors"
                      onClick={() => { setEditingPolicy(policy.id); setEditValue(String(currentVal)); }}
                    >
                      Edit limit →
                    </button>
                  )}
                </div>
              );
            })}

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex gap-3">
              <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Policy changes apply immediately to all future transactions. The AI agent also respects these rules in real-time.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log */}
      <Card className="bg-card/50 border-primary/10 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Activity
          </CardTitle>
          <CardDescription className="text-xs">Last 5 operations recorded in the audit trail.</CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6 font-mono border border-dashed rounded-lg border-border/50">
              NO AUDIT RECORDS YET
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log: any, i: number) => (
                <div key={log.id ?? i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/20 text-xs">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${log.status === "approved" ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <div>
                      <span className="font-bold uppercase font-mono">{log.operation?.replace("_", " ")}</span>
                      {log.wallet_name && <span className="text-muted-foreground ml-2">· {log.wallet_name}</span>}
                      {log.amount && <span className="text-muted-foreground ml-2">· {log.amount}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${log.status === "approved" ? "border-emerald-500/30 text-emerald-400" : "border-rose-500/30 text-rose-400"}`}
                    >
                      {log.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
