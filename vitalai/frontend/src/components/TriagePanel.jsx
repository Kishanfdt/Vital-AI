import { useState } from "react";
import { Spinner } from "./Spinner";
import { Sparkles, CheckSquare, AlertCircle, ShieldAlert, Activity } from "lucide-react";
import { formatClinicalTimestamp } from "../utils/formatters";

const API_URL = import.meta.env.VITE_API_URL;

const URGENCY_LABELS = {
  self_care: "Self Care Recommended",
  see_doctor_soon: "See a Doctor Soon",
  seek_emergency_care: "Seek Emergency Care",
};

export default function TriagePanel({ token }) {
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge]           = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [result, setResult]     = useState(null);
  const [assessedAt, setAssessedAt] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/triage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symptoms,
          age: age ? Number(age) : null,
          duration: duration || null,
          existing_conditions: [],
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail?.[0]?.msg || body?.detail || `Request failed (${response.status})`);
      }

      const data = await response.json();
      setResult(data);
      setAssessedAt(new Date().toISOString());
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
        <span className="section-label">Intake Protocol</span>
        <h1>Clinical Symptom Triage</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Structured symptom assessment for urgency guidance and recommended next steps.
        </p>
      </div>

      {/* ── Intake Form ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span className="card-section-label" style={{ margin: 0 }}>Step 1 of 1 · Clinical Intake Form</span>
          <span className="timestamp-text">Required fields *</span>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="symptoms">Primary Symptoms &amp; Chief Complaint *</label>
          <textarea
            id="symptoms"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Describe your symptoms in detail (e.g., sharp pain in lower back starting this morning, mild dizziness)"
            required
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 10 }}>
            <div>
              <label htmlFor="triage-age">Patient Age (Optional)</label>
              <input
                id="triage-age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="0"
                placeholder="e.g. 35"
              />
            </div>

            <div>
              <label htmlFor="triage-duration">Symptom Duration (Optional)</label>
              <input
                id="triage-duration"
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 2 days, 4 hours"
              />
            </div>
          </div>

          {error && <p className="error-text" role="alert">{error}</p>}

          <div className="row" style={{ marginTop: 20 }}>
            <button className="btn-primary" type="submit" disabled={loading || !symptoms.trim()}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Spinner size="sm" /> Evaluating Protocol…
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Activity size={15} /> Submit Intake Form
                </span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Triage Output (Left-Border Accent Card) ── */}
      {result && (
        <div className={`card-triage-accent accent-${result.urgency}`}>
          {/* Header Row with Permanent AI Attribution Chip */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={`urgency-badge urgency-${result.urgency}`}>
                {URGENCY_LABELS[result.urgency] || result.urgency}
              </span>
              <span className="timestamp-text">{formatClinicalTimestamp(assessedAt)}</span>
            </div>

            <span className="ai-disclaimer-chip">
              <Sparkles size={11} /> AI-Assisted Assessment
            </span>
          </div>

          {/* Severity Banner */}
          <div style={{ marginBottom: 14 }}>
            <div className="card-section-label" style={{ fontSize: 12, marginBottom: 4, color: "var(--ink)" }}>
              Triage Classification: {URGENCY_LABELS[result.urgency]?.toUpperCase() || result.urgency?.toUpperCase()}
            </div>
          </div>

          {/* Reasoning */}
          <div style={{ marginBottom: 18 }}>
            <span className="card-section-label">Clinical Rationale</span>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: "var(--lh-normal)", color: "var(--ink)" }}>
              {result.reasoning}
            </p>
          </div>

          {/* Recommended Next Steps Checklist */}
          {result.recommended_next_steps?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <span className="card-section-label">Recommended Action Checklist</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                {result.recommended_next_steps.map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <CheckSquare size={16} strokeWidth={2} style={{ color: "var(--deep-teal)", marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--ink)", lineHeight: "var(--lh-normal)" }}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Disclaimer */}
          <p className="disclaimer" style={{ marginTop: 14, paddingTop: 12 }}>
            {result.disclaimer || "This triage output is AI-assisted and provided for informational context only. It is not a medical diagnosis or treatment plan. In an emergency, call 911 immediately."}
          </p>
        </div>
      )}
    </div>
  );
}
