"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  wallet_name: string;
  chain: string;
  operation: string;
  status: string;
  tx_hash?: string;
  amount?: string;
  to_address?: string;
}

function explorerUrl(hash: string, chain: string): string {
  if (chain === "solana") {
    return `https://explorer.solana.com/tx/${hash}?cluster=devnet`;
  }
  return `https://sepolia.etherscan.io/tx/${hash}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatusIcon({ status }: { status: string }) {
  if (status === "approved") return <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />;
  if (status === "rejected" || status === "failed") return <XCircle className="h-3.5 w-3.5 text-rose-400" />;
  return <Clock className="h-3.5 w-3.5 text-amber-400" />;
}

export function TransactionHistory() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setLogs(res.data || []);
        else setError("Geçmiş yüklenemedi.");
      })
      .catch(() => setError("Geçmiş yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Yükleniyor…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-40 text-rose-400 text-sm">{error}</div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
        <Clock className="h-6 w-6 opacity-40" />
        <span className="text-sm">Henüz işlem yok.</span>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/40 text-muted-foreground">
            <th className="text-left py-2 px-3 font-medium">Tarih</th>
            <th className="text-left py-2 px-3 font-medium">İşlem</th>
            <th className="text-left py-2 px-3 font-medium">Cüzdan</th>
            <th className="text-left py-2 px-3 font-medium">Miktar</th>
            <th className="text-left py-2 px-3 font-medium">Durum</th>
            <th className="text-left py-2 px-3 font-medium">Hash</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-border/20 hover:bg-white/[0.02] transition-colors">
              <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                {formatDate(log.timestamp)}
              </td>
              <td className="py-2 px-3 font-mono">
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">
                  {log.operation}
                </span>
              </td>
              <td className="py-2 px-3 text-muted-foreground truncate max-w-[100px]">
                {log.wallet_name || "—"}
              </td>
              <td className="py-2 px-3 font-mono">
                {log.amount ? `${log.amount} ${log.chain === "solana" ? "SOL" : "ETH"}` : "—"}
              </td>
              <td className="py-2 px-3">
                <span className="flex items-center gap-1">
                  <StatusIcon status={log.status} />
                  <span className="capitalize text-[10px] text-muted-foreground">{log.status}</span>
                </span>
              </td>
              <td className="py-2 px-3">
                {log.tx_hash ? (
                  <a
                    href={explorerUrl(log.tx_hash, log.chain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline font-mono"
                  >
                    {log.tx_hash.slice(0, 8)}…
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
