import { useRef, useState } from "react";
import { Spinner } from "./Spinner";

const API_URL = import.meta.env.VITE_API_URL;

export default function ChatPanel({ token }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const logRef = useRef(null);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setError("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail?.[0]?.msg || body?.detail || `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
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
    <div className="card">
      <h2>Wellness Coach Chat</h2>
      <p>General lifestyle, nutrition, and stress-management guidance — not a substitute for a clinician.</p>

      <div className="chat-log" ref={logRef} aria-label="Conversation history">
        {messages.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">💬</span>
            <p>No messages yet. Ask about sleep, stress, nutrition, or exercise to get started.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-assistant"}`}
            aria-label={m.role === "user" ? "You" : "Coach"}
          >
            {m.content || (loading && i === messages.length - 1 ? "…" : "")}
          </div>
        ))}
      </div>

      {error && <p className="error-text" role="alert">{error}</p>}

      <form onSubmit={sendMessage} style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about sleep, stress, nutrition…"
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
          {loading ? <Spinner size="sm" /> : null}
          Send
        </button>
      </form>
    </div>
  );
}
