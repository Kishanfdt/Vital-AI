import { useEffect, useState } from "react";
import { Spinner, SkeletonLines } from "./Spinner";
import { useToast } from "./Toast";
import { EmptyState, EmptyJournal } from "./EmptyState";
import { Mic, MicOff, BookOpen, Sparkles, Tag } from "lucide-react";
import { formatRelativeTime, formatClinicalTimestamp } from "../utils/formatters";

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
  const [trendTime, setTrendTime]           = useState(null);

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
      toast("Journal entry logged to health record.", "success");
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
      setTrendTime(new Date().toISOString());
      toast("30-day health trend synthesis complete.", "success");
    } catch (err) {
      setTrendError(err.message);
    } finally {
      setLoadingTrends(false);
    }
  }

  return (
    <div className="page-content">
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 20 }}>
        <span className="section-label">Patient Health Log</span>
        <h1>Health &amp; Symptom Journal</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Structured longitudinal logging of physical and emotional symptoms for trend analysis.
        </p>
      </div>

      {/* ── Entry Form + Clinical History ── */}
      <div className="card">
        <span className="card-section-label">Log Clinical Note</span>

        <form onSubmit={handleAddEntry}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <label htmlFor="journal-content" style={{ margin: 0 }}>Today's Observation *</label>

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={toggleListening}
              className="btn-ghost"
              style={{
                fontSize: 11,
                padding: "3px 8px",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: isListening ? "var(--danger)" : "var(--deep-teal)",
                border: `1px solid ${isListening ? "var(--danger-border)" : "var(--line)"}`,
                background: isListening ? "var(--danger-bg)" : "transparent",
              }}
              title={speechSupported ? "Speak your journal entry" : "Voice dictation unsupported in this browser"}
            >
              {isListening ? <MicOff size={13} /> : <Mic size={13} />}
              {isListening ? "Stop Dictation" : "Voice Input"}
            </button>
          </div>

          <textarea
            id="journal-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Log physical feelings, sleep quality, stress levels, or symptom changes (e.g. Mild tension headache after screen work, energetic morning walk)."
            required
          />

          {error && <p className="error-text" role="alert">{error}</p>}

          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn-primary" type="submit" disabled={adding || !content.trim()}>
              {adding ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Spinner size="sm" /> Logging Entry…
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <BookOpen size={15} /> Save Log Entry
                </span>
              )}
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={handleFetchTrends}
              disabled={loadingTrends || entries.length === 0}
              aria-label="View 30-day health journal trend analysis"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {loadingTrends ? (
                <>
                  <Spinner size="sm" /> Synthesizing Trends…
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Analyze 30-Day Trends
                </>
              )}
            </button>
          </div>
        </form>

        <hr className="divider" />

        {/* ── Health Log List (Date-First EHR Format) ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span className="card-section-label" style={{ margin: 0 }}>Longitudinal Health Log</span>
          <span className="timestamp-text">{entries.length} Entries Recorded</span>
        </div>

        {loadingEntries ? (
          <SkeletonLines lines={4} />
        ) : entries.length === 0 ? (
          <EmptyState
            illustration={EmptyJournal}
            message="No journal logs recorded in patient chart yet. Write your first entry above."
          />
        ) : (
          <div className="ehr-table-wrapper">
            <table className="ehr-table" aria-label="Journal entry log table">
              <thead>
                <tr>
                  <th style={{ width: 170 }}>Date &amp; Time</th>
                  <th>Observation / Symptom Log</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="timestamp-text" style={{ whiteSpace: "nowrap", verticalAlign: "top" }}>
                      {formatClinicalTimestamp(entry.created_at)}
                    </td>
                    <td style={{ color: "#384643", lineHeight: "var(--lh-normal)" }}>
                      {entry.content}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trend Error */}
      {trendError && (
        <div className="card">
          <p className="error-text" role="alert">{trendError}</p>
        </div>
      )}

      {/* ── 30-Day AI Trend Output Card ── */}
      {trendResult && (
        <div className="card-triage-accent accent-teal">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="urgency-badge urgency-self_care">
                30-Day Trend Synthesis · {trendResult.total_entries} {trendResult.total_entries === 1 ? "entry" : "entries"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="ai-disclaimer-chip">
                <Sparkles size={11} /> AI Trend Analysis
              </span>
              <span className="timestamp-text">{formatClinicalTimestamp(trendTime)}</span>
            </div>
          </div>

          {trendResult.detected_clusters?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <span className="card-section-label">Identified Symptom Clusters</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {trendResult.detected_clusters.map((cluster, i) => (
                  <span
                    key={i}
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      borderRadius: 4,
                      padding: "3px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--deep-teal)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Tag size={11} /> {cluster}
                  </span>
                ))}
              </div>
            </div>
          )}

          <span className="card-section-label">Wellness &amp; Symptom Pattern Summary</span>
          <p style={{ whiteSpace: "pre-line", lineHeight: "var(--lh-normal)", margin: "4px 0 14px", color: "var(--ink)" }}>
            {trendResult.trend_summary}
          </p>

          <p className="disclaimer">
            {trendResult.disclaimer || "Trend synthesis is generated by AI algorithms analyzing your journal text. It is not a clinical diagnosis or medical assessment."}
          </p>
        </div>
      )}
    </div>
  );
}
