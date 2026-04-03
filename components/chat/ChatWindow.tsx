"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import MessageBubble from "./MessageBubble";
import ToolCallCard from "./ToolCallCard";
import TransactionCard from "./TransactionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Send, AlertCircle, Shield, X, ArrowLeft,
  Wallet, Activity, Plus, Zap, CornerDownLeft,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import dynamic from "next/dynamic";
import PolicyConfig from "../dashboard/PolicyConfig";

interface PendingTransaction {
  walletName: string;
  chain: string;
  to: string;
  amount: string;
  token: string;
}

const DashboardSummary = dynamic(() => import("../dashboard/DashboardSummary"), {
  ssr: false,
});

const demoActions = [
  {
    label: "List Wallets",
    text: "Show me all my wallets",
    icon: Wallet,
    description: "View all vaults",
  },
  {
    label: "Check Balances",
    text: "What are my current balances?",
    icon: Activity,
    description: "Live on-chain balances",
  },
  {
    label: "Create Wallet",
    text: "Create a new wallet called treasury-main",
    icon: Plus,
    description: "Generate a new OWS vault",
  },
  {
    label: "Simulate Send",
    text: "Simulate sending 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f742Dd",
    icon: Zap,
    description: "Preview gas & policy",
  },
];

export default function ChatWindow() {
  const {
    messages, isLoading, error,
    setLoading, setError, addMessage, clearMessages,
    updateMessage, initialize, syncMessage,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [pendingTx, setPendingTx] = useState<PendingTransaction | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { initialize(); }, [initialize]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingTx]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: uuidv4(),
      role: "user" as const,
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      let assistantContent = "";
      let assistantToolCalls: any[] = [];
      const assistantId = uuidv4();

      addMessage({
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        toolCalls: [],
      });

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n");

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);

            if (data.type === "message") {
              assistantContent += data.content;
            } else if (data.type === "tool_call") {
              assistantToolCalls = [...assistantToolCalls, {
                name: data.name,
                input: data.input,
                status: "pending",
              }];
            } else if (data.type === "tool_result") {
              assistantToolCalls = assistantToolCalls.map((t) =>
                t.name === data.result.name
                  ? { ...t, output: data.result, status: "completed" }
                  : t
              );
            } else if (data.type === "pending_approval") {
              setPendingTx(data.transaction as PendingTransaction);
            }

            updateMessage(assistantId, {
              content: assistantContent,
              toolCalls: assistantToolCalls,
            });
          } catch {
            // malformed chunk — skip
          }
        }
      }

      await syncMessage(assistantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTransaction = async () => {
    if (!pendingTx) return;
    setIsSigning(true);
    try {
      const res = await fetch("/api/wallet/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingTx),
      });
      const result = await res.json();
      const msg = result.success
        ? `✅ Transaction signed & broadcast.\nHash: \`${result.data?.hash ?? "N/A"}\``
        : `❌ Signing failed: ${result.error}`;
      addMessage({ id: uuidv4(), role: "assistant", content: msg, timestamp: new Date().toISOString() });
    } catch (err) {
      addMessage({ id: uuidv4(), role: "assistant", content: `❌ Signing error: ${String(err)}`, timestamp: new Date().toISOString() });
    } finally {
      setPendingTx(null);
      setIsSigning(false);
    }
  };

  const handleRejectTransaction = () => {
    setPendingTx(null);
    addMessage({
      id: uuidv4(),
      role: "assistant",
      content: "🚫 Transaction rejected by user.",
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto w-full p-3 sm:p-4">
      <Card className="flex-1 flex flex-col overflow-hidden border-border/60 bg-card/40 backdrop-blur-xl shadow-2xl">

        {/* ── Header ── */}
        <header className="shrink-0 px-4 sm:px-6 py-3 border-b border-border/50 flex items-center justify-between bg-black/20">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative h-7 w-7">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/30 to-blue-500/20 blur-sm" />
              <div className="relative h-7 w-7 rounded-lg border border-border/60 bg-card flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-foreground leading-none">OWS Treasury</div>
              <div className="text-[10px] text-muted-foreground font-mono tracking-widest leading-none mt-0.5">VAULT ENGINE V1.2</div>
            </div>
          </div>

          {/* Chain badges */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              SEPOLIA
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              DEVNET
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {!isAdminOpen ? (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => setIsAdminOpen(true)}>
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Policy</span>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => setIsAdminOpen(false)}>
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
              onClick={clearMessages}
              title="Clear chat"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </header>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          {isAdminOpen ? (
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
              <PolicyConfig onClose={() => setIsAdminOpen(false)} />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-2">
              {/* Stats bar */}
              <DashboardSummary />

              {messages.length === 0 ? (
                /* ── Welcome screen ── */
                <div className="flex flex-col items-center justify-center py-16 space-y-10 text-center">
                  <div className="space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      Talk to your wallet like a person.
                    </h2>
                    <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
                      AI-powered, policy-gated treasury management on Ethereum Sepolia &amp; Solana Devnet.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                    {demoActions.map(({ label, text, icon: Icon, description }) => (
                      <button
                        key={label}
                        onClick={() => setInput(text)}
                        className="group flex flex-col items-start gap-2 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-150 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-sm font-semibold text-foreground">{label}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          {description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── Message list ── */
                <div className="space-y-1 pt-2">
                  {messages.map((message) => (
                    <div key={message.id} className="animate-in slide-in-from-bottom-1 duration-200">
                      <MessageBubble message={message} />
                      {message.toolCalls?.map((toolCall, idx) => (
                        <ToolCallCard key={idx} toolCall={toolCall} />
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Pending approval card */}
              {pendingTx && (
                <TransactionCard
                  from={pendingTx.walletName}
                  to={pendingTx.to}
                  amount={pendingTx.amount}
                  token={pendingTx.token ?? (pendingTx.chain === "solana" ? "SOL" : "ETH")}
                  policyStatus="approved"
                  policyMessage="Policy checks passed. Awaiting your authorization."
                  onApprove={handleApproveTransaction}
                  onReject={handleRejectTransaction}
                  loading={isSigning}
                />
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center gap-2.5 px-1 py-3">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">Processing through policy engine…</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </div>

        {/* ── Input footer ── */}
        {!isAdminOpen && (
          <footer className="shrink-0 border-t border-border/50 bg-black/10 px-4 sm:px-6 py-4">
            <div className="max-w-3xl mx-auto flex gap-2 items-end">
              <div className="relative flex-1">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask your wallet anything…"
                  className="h-11 bg-background/60 border-border/50 focus:border-primary/50 pr-16 placeholder:text-muted-foreground/50 transition-colors"
                  disabled={isLoading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                  <CornerDownLeft className="h-3 w-3 text-muted-foreground/30" />
                </div>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                size="default"
                className="h-11 px-4 shrink-0 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </footer>
        )}
      </Card>
    </div>
  );
}
