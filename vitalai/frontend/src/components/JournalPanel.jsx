import { useEffect, useState } from "react";
import { Spinner, SkeletonLines } from "./Spinner";
import { useToast } from "./Toast";

const API_URL = import.meta.env.VITE_API_URL;

export default function JournalPanel({ token }) {
  const toast = useToast();
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
      if (!response.ok) throw new Error(`Failed to load journal entries (${response.status})`);
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
      toast("Journal entry saved.", "success");
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
      toast("Trend analysis ready.", "success");
    } catch (err) {
      setTrendError(err.message);
    } finally {
      setLoadingTrends(false);
    }
  }

  return (
    <div>
      {/* Add Journal Entry */}
      <div className="card">
        <h2>Health & Wellness Journal</h2>
        <p>Log how you are feeling physically and emotionally. Entries are embedded for semantic trend analysis.</p>

        <form onSubmit={handleAddEntry}>
          <label htmlFor="journal-content">Today's Entry</label>
          <textarea
            id="journal-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g., Felt energetic after morning walk. Had slight headache in the afternoon after long screen time."
            required
          />

          {error && <p className="error-text" role="alert">{error}</p>}

          <div className="row">
            <button className="btn-primary" type="submit" disabled={adding || !content.trim()}>
              {adding ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Spinner size="sm" /> Saving…
                </span>
              ) : "Save entry"}
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={handleFetchTrends}
              disabled={loadingTrends || entries.length === 0}
              aria-label="View 30-day health journal trend analysis"
            >
              {loadingTrends ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Spinner size="sm" /> Analyzing…
                </span>
              ) : "View 30-day trends"}
            </button>
          </div>
        </form>

        <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "24px 0 20px" }} />

        <h3>Recent Journal History</h3>

        {loadingEntries ? (
          <div style={{ marginTop: 12 }}>
            <SkeletonLines lines={4} />
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">📓</span>
            <p>No journal entries yet — write your first one above to start tracking your health over time.</p>
          </div>
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
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                  {new Date(entry.created_at).toLocaleDateString(undefined, {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: "#3f4c48" }}>{entry.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trend Error */}
      {trendError && (
        <div className="card">
          <p className="error-text" role="alert">{trendError}</p>
        </div>
      )}

      {/* Trend Results */}
      {trendResult && (
        <div className="card">
          <span className="urgency-badge urgency-self_care">
            30-Day Analysis · {trendResult.total_entries} {trendResult.total_entries === 1 ? "entry" : "entries"}
          </span>

          {trendResult.detected_clusters && trendResult.detected_clusters.length > 0 && (
            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <strong style={{ fontSize: 13, color: "var(--deep-teal)", display: "block", marginBottom: 8 }}>
                Detected Health & Mood Clusters:
              </strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {trendResult.detected_clusters.map((cluster, i) => (
                  <span
                    key={i}
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      borderRadius: 999,
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

          <h3 style={{ marginTop: 16 }}>Wellness & Symptom Pattern Summary</h3>
          <div style={{ whiteSpace: "pre-line", lineHeight: 1.6, color: "#3f4c48" }}>
            {trendResult.trend_summary}
          </div>

          {trendResult.disclaimer && <p className="disclaimer">{trendResult.disclaimer}</p>}
        </div>
      )}
    </div>
  );
}
