import { useRef, useState } from "react";
import { Spinner } from "./Spinner";
import { EmptyState, EmptyChat } from "./EmptyState";
import { Sparkles, Send, ShieldAlert, User } from "lucide-react";
import { formatRelativeTime } from "../utils/formatters";

const API_URL = import.meta.env.VITE_API_URL;

export default function ChatPanel({ token }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const logRef = useRef(null);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const timestamp = new Date().toISOString();
    const newMessages = [...messages, { role: "user", content: input, timestamp }];
    setMessages(newMessages);
    setInput("");
    setError("");
    setLoading(true);

    const assistantMsg = { role: "assistant", content: "", timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: newMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail?.[0]?.msg || body?.detail || `Request failed (${response.status})`);
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkText = decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: last.content + chunkText };
          return updated;
        });

        if (logRef.current) {
          logRef.current.scrollTop = logRef.current.scrollHeight;
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 20 }}>
        <span className="section-label">Consultation Log</span>
        <h1>AI Health Coach Chat</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Interactive wellness guidance for lifestyle, nutrition, and recovery routines.
        </p>
      </div>

      <div className="card">
        {/* Chat History Container */}
        <div className="chat-log" ref={logRef} aria-label="Clinical consultation log" aria-live="polite">
          {messages.length === 0 && (
            <EmptyState
              illustration={EmptyChat}
              message="No messages logged — ask about sleep hygiene, post-workout recovery, or daily nutrition."
            />
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`chat-row ${m.role === "user" ? "chat-row-user" : "chat-row-assistant"}`}
            >
              {/* Message Header / Avatar */}
              <div className="chat-sender-header" style={{ justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" ? (
                  <>
                    <span className="ai-disclaimer-chip" style={{ fontSize: 10, padding: "1px 6px" }}>
                      <Sparkles size={10} /> AI Health Coach
                    </span>
                    <span className="timestamp-text">{formatRelativeTime(m.timestamp)}</span>
                  </>
                ) : (
                  <>
                    <span className="timestamp-text">{formatRelativeTime(m.timestamp)}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--deep-teal)" }}>
                      <User size={12} /> Patient
                    </span>
                  </>
                )}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-assistant"}`}
                aria-label={m.role === "user" ? "Patient message" : "AI Health Coach response"}
              >
                {m.content || (loading && i === messages.length - 1 ? "Analyzing clinical query…" : "")}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="error-text" role="alert">{error}</p>}

        {/* Persistent Clinical Disclaimer Strip */}
        <div className="chat-disclaimer-strip">
          <ShieldAlert size={14} style={{ color: "var(--warning)", flexShrink: 0 }} />
          <span>
            This chat provides general health &amp; wellness guidance, not a medical diagnosis. In an emergency, call 911 immediately.
          </span>
        </div>

        {/* Input Form */}
        <form onSubmit={sendMessage} style={{ display: "flex", gap: 10 }}>
          <input
            id="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your health or lifestyle question…"
            aria-label="Message to wellness coach"
            style={{ flex: 1 }}
          />
          <button
            className="btn-primary"
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
            style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
          >
            {loading ? <Spinner size="sm" /> : <Send size={14} />}
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
