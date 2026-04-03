"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ToolCall } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, Clock } from "lucide-react";
import SimulationDiff from "./SimulationDiff";

interface ToolCallCardProps {
  toolCall: ToolCall;
}

export default function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    pending: {
      icon: <Clock className="w-4 h-4 text-amber-500 animate-pulse" />,
      text: "Executing Command...",
      border: "border-l-amber-500/50",
      bg: "bg-amber-500/5"
    },
    completed: {
      icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
      text: "Operation Success",
      border: "border-l-emerald-500/50",
      bg: "bg-emerald-500/5"
    },
    failed: {
      icon: <AlertCircle className="w-4 h-4 text-rose-500" />,
      text: "Operation Failed",
      border: "border-l-rose-500/50",
      bg: "bg-rose-500/5"
    },
  }[toolCall.status] || {
    icon: <Clock className="w-4 h-4 text-muted-foreground" />,
    text: "Unknown Status",
    border: "border-l-border",
    bg: "bg-muted/20"
  };

  return (
    <Card className={cn(
      "border-l-4 p-0 my-3 overflow-hidden transition-all duration-300 bg-card border-border", 
      statusConfig.border,
      statusConfig.bg
    )}>
      <Button
        variant="ghost"
        className="w-full justify-between h-auto py-3 px-4 hover:bg-accent/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 text-left">
          <div className="p-1.5 rounded-full bg-black/20">
            {statusConfig.icon}
          </div>
          <div>
            <div className="font-mono text-xs font-bold tracking-tight text-foreground/90 uppercase">
              {toolCall.name.replace(/_/g, " ")}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 uppercase">
              {statusConfig.text}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">DETAILS</span>
           {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </Button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="h-px bg-border/50" />
          
          {toolCall.input && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-blue-500"></span>
                Input Parameters
              </div>
              <pre className="bg-black/40 p-3 rounded-lg text-[11px] font-mono whitespace-pre-wrap break-all text-blue-400/90 border border-blue-500/10">
                {JSON.stringify(toolCall.input, null, 2)}
              </pre>
            </div>
          )}

          {toolCall.output && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-emerald-500"></span>
                Execution Result
              </div>
              {toolCall.name === "simulate_transaction" && toolCall.output?.success ? (
                <SimulationDiff
                  chain={toolCall.input?.chain ?? "evm"}
                  before="—"
                  after={toolCall.output.data?.simulation?.balanceAfter ?? "0"}
                  amount={toolCall.input?.amount ?? "0"}
                  fee={toolCall.output.data?.simulation?.totalCost ?? "0"}
                  symbol={toolCall.input?.token ?? (toolCall.input?.chain === "solana" ? "SOL" : "ETH")}
                />
              ) : (
                <pre className="bg-black/40 p-3 rounded-lg text-[11px] font-mono whitespace-pre-wrap break-all text-emerald-400/90 border border-emerald-500/10">
                  {JSON.stringify(toolCall.output, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
