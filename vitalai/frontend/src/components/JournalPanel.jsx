import { useEffect, useState } from "react";
import { Spinner, SkeletonLines } from "./Spinner";
import { useToast } from "./Toast";
import { EmptyState, EmptyJournal } from "./EmptyState";
import { Mic, MicOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export default function JournalPanel({ token }) {
  const toast = useToast();
  const [entries, setEntries]               = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [content, setContent]               = useState("");
  const [adding, setAdding]                 = useState(false);
  const [error, setError]                   = useState("");
  const [loadingTrends, setLoadingTrends]   = useState(false);
  const [trendResult, setTrendResult]       = useState(null);
  const [trendError, setTrendError]         = useState("");

  /* Voice input state */
  const [isListening, setIsListening]       = useState(false);
  const [recognition, setRecognition]       = useState(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    fetchEntries();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setContent((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
        }
      };

      rec.onerror = (err) => {
        console.error("Speech recognition error:", err);
        setIsListening(false);
        toast("Voice dictation error. Please try typing.", "error");
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    } else {
      setSpeechSupported(false);
    }
  }, [token]);

  const toggleListening = () => {
    if (!speechSupported || !recognition) {
      toast("Speech recognition is not supported in this browser (Use Chrome or Edge).", "info");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      toast("Voice dictation stopped.", "info");
    } else {
      try {
        recognition.start();
        setIsListening(true);
        toast("Listening... Speak your journal entry.", "info");
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  async function fetchEntries() {
    setLoadingEntries(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/journal`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to load entries (${response.status})`);
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
    if (isListening && recognition) {
      recognition.stop();
      setIsListening(false);
    }
    setAdding(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    <div className="page-content">
      {/* Entry Form + History */}
      <div className="card">
        <h2>Health &amp; Wellness Journal</h2>
        <p style={{ marginBottom: 20 }}>
          Log how you are feeling physically and emotionally. Entries are embedded for semantic trend analysis.
        </p>

        <form onSubmit={handleAddEntry}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <label htmlFor="journal-content" style={{ margin: 0 }}>Today's Entry</label>
            
            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={toggleListening}
              className="btn-ghost"
              style={{
                fontSize: "var(--text-xs)",
                padding: "4px 10px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: isListening ? "var(--clay)" : "var(--deep-teal)",
                border: `1px solid ${isListening ? "var(--clay)" : "var(--line)"}`,
                background: isListening ? "rgba(199, 111, 79, 0.1)" : "transparent",
              }}
              title={speechSupported ? "Speak your journal entry" : "Voice dictation unsupported in this browser"}
            >
              {isListening ? <MicOff size={14} className="spin" /> : <Mic size={14} />}
              {isListening ? "Stop Dictation" : "Voice Input"}
            </button>
          </div>

          {!speechSupported && (
            <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 8px 0" }}>
              💡 Voice dictation relies on Web Speech API (supported in Chrome/Edge).
            </p>
          )}

          <textarea
            id="journal-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g., Felt energetic after morning walk. Had slight headache in the afternoon after long screen time."
            required
          />

          {error && <p className="error-text" role="alert">{error}</p>}

          <div className="row" style={{ marginTop: 14 }}>
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

        <hr className="divider" />

        <h3 style={{ marginBottom: 14 }}>Recent Journal History</h3>

        {loadingEntries ? (
          <div style={{ marginTop: 12 }}><SkeletonLines lines={4} /></div>
        ) : entries.length === 0 ? (
          <EmptyState
            illustration={EmptyJournal}
            message="No journal entries yet — write your first one above to start tracking your health over time."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: "12px 14px",
                  background: "var(--paper)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                  transition: "box-shadow var(--duration-fast) var(--ease-standard)",
                }}
              >
                <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginBottom: 6, fontWeight: 500 }}>
                  {new Date(entry.created_at).toLocaleDateString(undefined, {
                    weekday: "short", year: "numeric", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
                <div style={{ fontSize: "var(--text-sm)", lineHeight: "var(--lh-normal)", color: "#3f4c48" }}>
                  {entry.content}
                </div>
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
        <div className="card card-elevated">
          <span className="urgency-badge urgency-self_care">
            30-Day Analysis · {trendResult.total_entries} {trendResult.total_entries === 1 ? "entry" : "entries"}
          </span>

          {trendResult.detected_clusters?.length > 0 && (
            <div style={{ marginTop: 16, marginBottom: 6 }}>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--deep-teal)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 8 }}>
                Detected Clusters
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {trendResult.detected_clusters.map((cluster, i) => (
                  <span
                    key={i}
                    style={{
                      background: "var(--paper)", border: "1px solid var(--line)",
                      borderRadius: 999, padding: "4px 12px",
                      fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--deep-teal)",
                    }}
                  >
                    🏷 {cluster}
                  </span>
                ))}
              </div>
            </div>
          )}

          <h3 style={{ marginTop: 18 }}>Wellness &amp; Symptom Pattern Summary</h3>
          <p style={{ whiteSpace: "pre-line", lineHeight: "var(--lh-normal)" }}>
            {trendResult.trend_summary}
          </p>

          {trendResult.disclaimer && <p className="disclaimer">{trendResult.disclaimer}</p>}
        </div>
      )}
    </div>
  );
}
