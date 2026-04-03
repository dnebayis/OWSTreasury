"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface TransactionCardProps {
  from: string;
  to: string;
  amount: string;
  token: string;
  gasEstimate?: string;
  policyStatus: "approved" | "denied" | "warning";
  policyMessage: string;
  onApprove: () => void;
  onReject: () => void;
  loading?: boolean;
}

export default function TransactionCard({
  from,
  to,
  amount,
  token,
  gasEstimate,
  policyStatus,
  policyMessage,
  onApprove,
  onReject,
  loading = false,
}: TransactionCardProps) {
  const [showDetails, setShowDetails] = useState(true);

  const statusConfig = {
    approved: {
      icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
      color: "border-emerald-500/30 bg-emerald-500/5",
      title: "Policy Compliant",
      description: "This transaction meets all treasury safety requirements."
    },
    denied: {
      icon: <XCircle className="w-5 h-5 text-rose-500" />,
      color: "border-rose-500/30 bg-rose-500/5",
      title: "Policy Violation",
      description: "This transaction has been blocked by security protocols."
    },
    warning: {
      icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
      color: "border-amber-500/30 bg-amber-500/5",
      title: "Security Warning",
      description: "Proceed with caution. Unusual activity detected."
    },
  }[policyStatus];

  return (
    <Card className={cn("border-2 p-6 my-8 shadow-2xl relative overflow-hidden", statusConfig.color)}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
      
      <div className="space-y-6">
        {/* Policy Status */}
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-xl bg-background/50 border border-border/50">
            {statusConfig.icon}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold tracking-tight text-foreground uppercase">
              {statusConfig.title}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 font-medium">
              {policyMessage || statusConfig.description}
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="bg-background/40 backdrop-blur-md rounded-xl p-5 space-y-4 border border-border/40 shadow-inner">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount</span>
              <div className="text-lg font-bold text-primary font-mono tracking-tighter">
                {amount} <span className="text-xs opacity-60">{token}</span>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Network</span>
              <div className="text-xs font-bold text-foreground">
                ETHEREUM SEPOLIA
              </div>
            </div>
          </div>

          <div className="h-px bg-border/20" />

          <div className="space-y-3">
            <div className="flex justify-between items-center group">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sender</span>
              <span className="font-mono text-xs text-foreground/80 bg-muted/30 px-2 py-1 rounded border border-border/50 group-hover:border-primary/30 transition-colors">
                {from.substring(0, 8)}...{from.substring(from.length - 8)}
              </span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recipient</span>
              <span className="font-mono text-xs text-foreground/80 bg-muted/30 px-2 py-1 rounded border border-border/50 group-hover:border-primary/30 transition-colors">
                {to.substring(0, 8)}...{to.substring(to.length - 8)}
              </span>
            </div>
          </div>

          {gasEstimate && (
            <>
              <div className="h-px bg-border/20" />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Estimated Gas</span>
                <span className="font-mono text-xs text-amber-500/90 font-bold">{gasEstimate}</span>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {policyStatus !== "denied" && (
            <div className="flex gap-3">
              <Button
                onClick={onApprove}
                disabled={loading}
                size="lg"
                className="flex-1 bg-primary text-primary-foreground font-bold h-12 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all uppercase tracking-widest text-[11px]"
              >
                {loading ? "Authorizing..." : "✓ Authorize & Sign"}
              </Button>
              <Button
                onClick={onReject}
                disabled={loading}
                variant="outline"
                size="lg"
                className="flex-1 h-12 border-border/50 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 transition-all uppercase tracking-widest text-[11px]"
              >
                ✗ Terminate
              </Button>
            </div>
          )}

          {policyStatus === "denied" && (
            <Button disabled className="w-full h-12 bg-rose-500/20 text-rose-500 border border-rose-500/30 font-bold uppercase tracking-widest text-[11px]">
              ✗ Protocol Violation: Execution Blocked
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
