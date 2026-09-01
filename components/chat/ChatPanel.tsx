"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, Check, AlertCircle, Loader2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolActions?: Array<{
    toolName: string;
    success: boolean;
    message?: string;
  }>;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function ChatPanel({ isOpen, onClose, title = "AI Assistant" }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I can help you create invoices, track payments, and prepare tax summaries. What would you like to do?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, sessionId, channel: "web" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, toolActions: data.toolActions },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-950">
              <Bot className="h-4 w-4 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold text-neutral-950">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed",
                  msg.role === "user"
                    ? "rounded-2xl rounded-br-sm bg-neutral-950 px-4 py-2.5 text-white"
                    : "rounded-2xl rounded-bl-sm border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-neutral-800"
                )}
              >
                {msg.content}
                {msg.toolActions && msg.toolActions.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-neutral-200 pt-3">
                    {msg.toolActions.map((action, j) => (
                      <div
                        key={j}
                        className={cn(
                          "flex items-start gap-2 rounded-md px-2 py-1.5 text-xs",
                          action.success
                            ? "bg-white text-neutral-700"
                            : "bg-neutral-100 text-neutral-600"
                        )}
                      >
                        {action.success ? (
                          <Check className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} />
                        ) : (
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} />
                        )}
                        <span>
                          <span className="font-medium capitalize">
                            {action.toolName.replace(/_/g, " ")}
                          </span>
                          {action.message && `: ${action.message}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                Thinking
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="border-t border-neutral-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()} size="sm">
              <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </div>
          <p className="mt-2.5 text-[11px] text-neutral-400">
            e.g. Create an invoice for Kofi, 1,200 GHS for web design
          </p>
        </form>
      </div>
    </div>
  );
}
