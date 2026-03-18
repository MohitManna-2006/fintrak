"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowUp, Zap } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const SUGGESTED_PROMPTS = [
  "How much did I spend this month?",
  "What's my biggest expense category?",
  "Am I on track with my budgets?",
  "How does this month compare to last?",
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/copilot/history")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Message[]) => setMessages(data))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || streaming) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: msg,
        createdAt: new Date().toISOString(),
      };

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setStreaming(true);

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      try {
        const historyForApi = [...messages, userMsg]
          .filter((m) => m.content)
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg, history: historyForApi }),
        });

        if (!res.ok || !res.body) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: "Sorry, something went wrong. Please try again.",
            };
            return updated;
          });
          setStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...last,
              content: last.content + chunk,
            };
            return updated;
          });
        }
      } catch {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: "Sorry, something went wrong. Please try again.",
          };
          return updated;
        });
      } finally {
        setStreaming(false);
      }
    },
    [input, streaming, messages],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const hasInput = input.trim().length > 0;
  const showSuggestions = loaded && messages.length === 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        maxWidth: 1100,
        fontFamily: "var(--font-figtree), sans-serif",
      }}
    >
      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
      `}</style>

      {/* HEADER */}
      <div
        style={{
          padding: "32px 40px 0",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            paddingBottom: 24,
            marginBottom: 0,
            borderBottom: "1px solid rgba(255,255,255,0.055)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: -1,
              left: 0,
              width: 48,
              height: 1,
              background: "#00c896",
              boxShadow: "0 0 8px #00c896",
            }}
          />
          <div
            style={{
              fontFamily: "var(--font-syne)",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.8px",
              color: "#f0f0f4",
              lineHeight: 1,
            }}
          >
            AI Copilot
          </div>
          <div
            style={{
              fontFamily: "var(--font-space-mono)",
              fontSize: 11,
              color: "#72727e",
              opacity: 0.75,
              marginTop: 5,
              letterSpacing: "0.06em",
            }}
          >
            {"// ASK ANYTHING ABOUT YOUR MONEY"}
          </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {showSuggestions && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "rgba(0,200,150,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={24} color="#00c896" strokeWidth={1.5} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--font-syne)",
                  fontWeight: 600,
                  fontSize: 16,
                  color: "#f0f0f4",
                  marginBottom: 6,
                }}
              >
                What can I help with?
              </div>
              <div
                style={{
                  fontFamily: "var(--font-figtree)",
                  fontSize: 13,
                  color: "#72727e",
                }}
              >
                Ask me anything about your finances
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                maxWidth: 460,
                width: "100%",
              }}
            >
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  style={{
                    background: "#0c0c0f",
                    border: "1px solid rgba(255,255,255,0.055)",
                    borderRadius: 6,
                    padding: "10px 14px",
                    fontFamily: "var(--font-figtree)",
                    fontSize: 12.5,
                    color: "#72727e",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)")
                  }
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "user" ? (
              <div
                style={{
                  maxWidth: "75%",
                  background: "#131318",
                  border: "1px solid rgba(255,255,255,0.055)",
                  borderRadius: "8px 8px 2px 8px",
                  padding: "12px 16px",
                  fontFamily: "var(--font-figtree)",
                  fontSize: 13.5,
                  color: "#f0f0f4",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
              </div>
            ) : (
              <div
                style={{
                  maxWidth: "85%",
                  borderLeft: "2px solid #00c896",
                  paddingLeft: 14,
                  fontFamily: "var(--font-figtree)",
                  fontSize: 13.5,
                  color: "#f0f0f4",
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  minHeight: 20,
                }}
              >
                {msg.content || (
                  <span style={{ display: "inline-flex", gap: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#00c896",
                          animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </span>
                )}
              </div>
            )}
            <div
              style={{
                fontFamily: "var(--font-space-mono)",
                fontSize: 10,
                color: "#363640",
                marginTop: 4,
              }}
            >
              {formatTime(msg.createdAt)}
            </div>
          </div>
        ))}
      </div>

      {/* INPUT AREA */}
      <div
        style={{
          padding: "16px 40px",
          borderTop: "1px solid rgba(255,255,255,0.055)",
          background: "#040406",
          flexShrink: 0,
        }}
      >
        <div style={{ position: "relative" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            placeholder="Ask about your finances..."
            rows={1}
            style={{
              width: "100%",
              background: "#131318",
              border: "1px solid rgba(255,255,255,0.055)",
              borderRadius: 8,
              fontFamily: "var(--font-figtree)",
              fontSize: 13.5,
              color: "#f0f0f4",
              padding: "12px 50px 12px 16px",
              outline: "none",
              resize: "none",
              overflow: "hidden",
              lineHeight: 1.5,
              opacity: streaming ? 0.5 : 1,
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "rgba(0,200,150,0.4)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)")
            }
          />
          <button
            onClick={() => handleSend()}
            disabled={streaming || !hasInput}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: hasInput && !streaming ? "#00c896" : "#1a1a21",
              color: hasInput && !streaming ? "#000" : "#72727e",
              cursor: hasInput && !streaming ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s ease",
            }}
          >
            <ArrowUp size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
