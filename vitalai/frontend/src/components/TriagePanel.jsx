import { useState } from "react";
import { Spinner } from "./Spinner";

const API_URL = import.meta.env.VITE_API_URL;

const URGENCY_LABELS = {
  self_care: "Self care",
  see_doctor_soon: "See a doctor soon",
  seek_emergency_care: "Seek emergency care",
};

export default function TriagePanel({ token }) {
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h2>Symptom Check</h2>
        <p>Describe what you're feeling and get a cautious urgency assessment with next steps.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="symptoms">What's going on?</label>
          <textarea
            id="symptoms"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g. sharp pain in my lower back that started this morning"
            required
          />

          <label htmlFor="triage-age">Age (optional)</label>
          <input
            id="triage-age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min="0"
            placeholder="e.g. 35"
          />

          <label htmlFor="triage-duration">How long has this been going on? (optional)</label>
          <input
            id="triage-duration"
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 2 days"
          />

          {error && <p className="error-text" role="alert">{error}</p>}

          <div className="row">
            <button className="btn-primary" type="submit" disabled={loading || !symptoms.trim()}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Spinner size="sm" /> Assessing…
                </span>
              ) : (
                "Get assessment"
              )}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div className="card">
          <span className={`urgency-badge urgency-${result.urgency}`}>
            {URGENCY_LABELS[result.urgency] || result.urgency}
          </span>
          <h3 style={{ marginTop: 14 }}>Reasoning</h3>
          <p>{result.reasoning}</p>
          <h3>Recommended next steps</h3>
          <ul style={{ paddingLeft: 20, marginTop: 6 }}>
            {result.recommended_next_steps.map((step, i) => (
              <li key={i} style={{ marginBottom: 4, lineHeight: 1.5 }}>{step}</li>
            ))}
          </ul>
          <p className="disclaimer">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
