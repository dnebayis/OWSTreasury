"use client";

import type { Message } from "@/types";
import { cn } from "@/lib/utils";
import MarkdownContent from "./MarkdownContent";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (!message.content) return null;

  return (
    <div className={cn("flex w-full mb-3", isUser ? "justify-end" : "justify-start")}>
      {/* Avatar — assistant only */}
      {!isUser && (
        <div className="shrink-0 h-7 w-7 rounded-lg border border-border/60 bg-card flex items-center justify-center mr-2.5 mt-0.5">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-primary/80" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <div className={cn("max-w-[82%] sm:max-w-[75%] space-y-1", isUser && "items-end flex flex-col")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted/40 border border-border/40 text-foreground rounded-bl-sm backdrop-blur-sm"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownContent content={message.content} />
          )}
        </div>

        <span className="text-[10px] font-mono text-muted-foreground/40 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
