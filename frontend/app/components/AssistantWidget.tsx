"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { API_URL } from "../lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  agent?: string;
  degraded?: boolean;
  error?: boolean;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm the Mandi Assistant. Ask me about today's price for a crop, help writing a listing, finding a buyer, group pools, or how Mandi works.",
};

export default function AssistantWidget() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/assistant/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setMessages([
        ...next,
        { role: "assistant", content: data.reply || "…", agent: data.agent, degraded: Boolean(data.degraded) },
      ]);
    } catch (err) {
      setMessages([...next, { role: "assistant", content: (err as Error).message, error: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-header-title">Mandi Assistant</div>
            <div className="chat-header-sub">15 specialists, one chat</div>
          </div>

          <div className="chat-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i}>
                {m.role === "assistant" && m.agent && (
                  <div className="chat-agent-tag">{m.agent}</div>
                )}
                <div className={`chat-bubble ${m.role}${m.error ? " error" : ""}`}>{m.content}</div>
                {m.degraded && <div className="chat-degraded-tag">Basic mode — smart assistant offline</div>}
              </div>
            ))}
            {loading && (
              <div className="chat-typing">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Ask about a crop's price, a listing, an order…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
            />
            <button onClick={send} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}

      <button className="chat-toggle" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close chat" : "Open chat"}>
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
