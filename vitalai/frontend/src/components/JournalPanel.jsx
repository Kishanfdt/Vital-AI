import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function JournalPanel({ token }) {
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [content, setContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const [loadingTrends, setLoadingTrends] = useState(false);
  const [trendResult, setTrendResult] = useState(null);
  const [trendError, setTrendError] = useState("");

  useEffect(() => {
    fetchEntries();
  }, [token]);

  async function fetchEntries() {
    setLoadingEntries(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/journal`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to load journal entries (${response.status})`);
      }
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingEntries(false);
    }
  }

  async function handleAddEntry(e) {
    e.preventDefault();
    if (!content.trim()) return;

    setAdding(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/journal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || `Failed to create entry (${response.status})`);
      }

      setContent("");
      await fetchEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleFetchTrends() {
    setLoadingTrends(true);
    setTrendError("");
    setTrendResult(null);

    try {
      const response = await fetch(`${API_URL}/journal/trends`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || `Failed to generate trend analysis (${response.status})`);
      }

      const data = await response.json();
      setTrendResult(data);
    } catch (err) {
      setTrendError(err.message);
    } finally {
      setLoadingTrends(false);
    }
  }

  return (
    <div>
      {/* 1. Add Journal Entry Card */}
      <div className="card">
        <h2>Health & Wellness Journal</h2>
        <p>Log how you are feeling physically and emotionally today. Embeddings help track health trends over time.</p>

        <form onSubmit={handleAddEntry} style={{ marginBottom: 24 }}>
          <label htmlFor="journal-content">Today's Entry</label>
          <textarea
            id="journal-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g., Felt energetic after morning walk. Had slight headache in afternoon after working on screen."
            required
          />

          {error && <p className="error-text">{error}</p>}

          <div className="row">
            <button className="btn-primary" type="submit" disabled={adding || !content.trim()}>
              {adding ? "Saving entry & embedding…" : "Save entry"}
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={handleFetchTrends}
              disabled={loadingTrends || entries.length === 0}
            >
              {loadingTrends ? "Analyzing 30-day trends…" : "View 30-day trends"}
            </button>
          </div>
        </form>

        <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "20px 0" }} />

        <h3>Recent Journal History</h3>
        {loadingEntries ? (
          <p style={{ color: "#8a938f", fontSize: 14 }}>Loading journal entries…</p>
        ) : entries.length === 0 ? (
          <p style={{ color: "#8a938f", fontSize: 14 }}>No journal entries recorded yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: "12px 14px",
                  background: "var(--paper)",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                }}
              >
                <div style={{ fontSize: 12, color: "#8a938f", marginBottom: 6 }}>
                  {new Date(entry.created_at).toLocaleDateString(undefined, {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5, color: "#3f4c48" }}>{entry.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Trends Analysis Card */}
      {trendError && (
        <div className="card">
          <p className="error-text">{trendError}</p>
        </div>
      )}

      {trendResult && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span className="urgency-badge urgency-self_care">
              30-Day Trend Analysis ({trendResult.total_entries} {trendResult.total_entries === 1 ? "entry" : "entries"})
            </span>
          </div>

          {trendResult.detected_clusters && trendResult.detected_clusters.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <strong style={{ fontSize: 13, color: "var(--deep-teal)", display: "block", marginBottom: 6 }}>
                Identified Health & Mood Clusters:
              </strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {trendResult.detected_clusters.map((cluster, i) => (
                  <span
                    key={i}
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      borderRadius: 16,
                      padding: "4px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--deep-teal)",
                    }}
                  >
                    🏷️ {cluster}
                  </span>
                ))}
              </div>
            </div>
          )}

          <h3>Wellness & Symptom Pattern Summary</h3>
          <div style={{ whiteSpace: "pre-line", lineHeight: 1.6, color: "#3f4c48" }}>
            {trendResult.trend_summary}
          </div>
        </div>
      )}
    </div>
  );
}
