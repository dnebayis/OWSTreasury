"use client";

import { ArrowRight, Minus, Plus, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SimulationDiffProps {
  chain: string;
  before: string;
  after: string;
  amount: string;
  fee: string;
  symbol: string;
}

export default function SimulationDiff({ chain, before, after, amount, fee, symbol }: SimulationDiffProps) {
  const beforeVal = parseFloat(before) || 0;
  const afterVal = parseFloat(after) || 0;
  const diff = afterVal - beforeVal;
  const isLoss = diff < 0;

  return (
    <div className="space-y-4 py-2 animate-in fade-in zoom-in duration-500">
      <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-widest font-bold">
        <span>Balance Simulation</span>
        <Badge variant="outline" className="text-[10px] bg-primary/5">{chain}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 relative">
        {/* Connection Line */}
        <div className="absolute left-[1.35rem] top-8 bottom-8 w-px bg-border/50 dashed border-l border-dashed"></div>

        {/* Before State */}
        <div className="flex items-center gap-4 bg-muted/20 p-3 rounded-lg border border-border/30">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border">
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Current Balance</div>
            <div className="text-lg font-mono font-bold tracking-tight">{before} {symbol}</div>
          </div>
        </div>

        {/* Transaction Impact */}
        <div className="flex items-center gap-4 px-3 py-1">
          <div className="h-10 w-10 flex items-center justify-center relative">
             <div className="h-4 w-4 rounded-full bg-background border border-border z-10 flex items-center justify-center">
               <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
             </div>
          </div>
          <div className="flex-1 flex items-center justify-between">
             <div className="space-y-0.5">
               <div className="flex items-center gap-1.5 text-xs font-semibold">
                 <Minus className="h-3 w-3 text-destructive" />
                 <span>Send {amount} {symbol}</span>
               </div>
               <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                 <Minus className="h-2.5 w-2.5" />
                 <span>Est. Fee: {fee} {symbol}</span>
               </div>
             </div>
             <div className={`text-sm font-bold font-mono ${isLoss ? 'text-destructive' : 'text-emerald-400'}`}>
               {isLoss ? '' : '+'}{diff.toFixed(6)} {symbol}
             </div>
          </div>
        </div>

        {/* After State */}
        <div className="flex items-center gap-4 bg-primary/5 p-3 rounded-lg border border-primary/20 ring-1 ring-primary/10 shadow-[0_0_15px_-5px_rgba(var(--primary),0.1)]">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-[10px] text-primary/70 font-bold uppercase tracking-tight">Projected Balance</div>
            <div className="text-lg font-mono font-bold tracking-tight text-primary">{after} {symbol}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendingUp(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
