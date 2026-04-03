"use client";

import { useEffect, useState } from "react";
import { Wallet, Landmark, Coins, Activity } from "lucide-react";

interface TreasurySummary {
  totalWallets: number;
  totalEVMBalance: string;
  totalSolanaBalance: string;
  lastAction: string;
}

const stats = (s: TreasurySummary) => [
  {
    label: "Wallets",
    value: String(s.totalWallets),
    sub: "OWS Vault",
    icon: Wallet,
    color: "text-primary",
  },
  {
    label: "sepoliaETH",
    value: s.totalEVMBalance,
    sub: "Sepolia",
    icon: Landmark,
    color: "text-blue-400",
  },
  {
    label: "SOL",
    value: s.totalSolanaBalance,
    sub: "Devnet",
    icon: Coins,
    color: "text-emerald-400",
  },
  {
    label: "Last Op",
    value: s.lastAction === "None" ? "—" : s.lastAction.replace(/_/g, " "),
    sub: "Activity",
    icon: Activity,
    color: "text-amber-400",
  },
];

export default function DashboardSummary() {
  const [mounted, setMounted] = useState(false);
  const [summary, setSummary] = useState<TreasurySummary>({
    totalWallets: 0,
    totalEVMBalance: "0.0000",
    totalSolanaBalance: "0.00",
    lastAction: "None",
  });

  useEffect(() => {
    setMounted(true);
    async function fetchSummary() {
      try {
        const r = await fetch("/api/summary");
        if (r.ok) setSummary(await r.json());
      } catch {
        // silent — keep defaults
      }
    }
    fetchSummary();
    const id = setInterval(fetchSummary, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      {stats(summary).map(({ label, value, sub, icon: Icon, color }) => (
        <div
          key={label}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm hover:border-border/70 transition-colors"
        >
          <div className={`shrink-0 ${color} opacity-70`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className={`text-sm font-bold font-mono truncate ${color}`}>{value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mt-0.5">{sub} · {label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
