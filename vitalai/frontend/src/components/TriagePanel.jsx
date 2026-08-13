import { useState } from "react";

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
        <h2>Check your symptoms</h2>
        <p>Get a quick, cautious read on how urgently you should seek care.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="symptoms">What's going on?</label>
          <textarea
            id="symptoms"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g. sharp pain in my lower back that started this morning"
            required
          />

          <label htmlFor="age">Age (optional)</label>
          <input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} min="0" />

          <label htmlFor="duration">How long has this been going on? (optional)</label>
          <input
            id="duration"
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 2 days"
          />

          {error && <p className="error-text">{error}</p>}

          <div className="row">
            <button className="btn-primary" type="submit" disabled={loading || !symptoms.trim()}>
              {loading ? "Assessing…" : "Get assessment"}
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
          <ul>
            {result.recommended_next_steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
          <p className="disclaimer">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
