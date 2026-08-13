import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function MedicationsPanel({ token }) {
  const [medications, setMedications] = useState([]);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [loadingMeds, setLoadingMeds] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    fetchMedications();
  }, [token]);

  async function fetchMedications() {
    setLoadingMeds(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/medications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to load medications (${response.status})`);
      }
      const data = await response.json();
      setMedications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMeds(false);
    }
  }

  async function handleAddMedication(e) {
    e.preventDefault();
    if (!name.trim()) return;

    setAdding(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/medications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), dosage: dosage.trim() || null }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || `Failed to add medication (${response.status})`);
      }

      setName("");
      setDosage("");
      await fetchMedications();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    setError("");
    try {
      const response = await fetch(`${API_URL}/medications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to delete medication (${response.status})`);
      }
      setMedications((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCheckInteractions() {
    setChecking(true);
    setError("");
    setCheckResult(null);

    try {
      const response = await fetch(`${API_URL}/medications/check`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || `Interaction check failed (${response.status})`);
      }

      const data = await response.json();
      setCheckResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      {/* 1. Add & Manage Medications Card */}
      <div className="card">
        <h2>My Medications</h2>
        <p>Keep track of your current prescription and over-the-counter medications.</p>

        <form onSubmit={handleAddMedication} style={{ marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label htmlFor="med-name">Medication Name</label>
              <input
                id="med-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aspirin, Ibuprofen"
                required
              />
            </div>
            <div>
              <label htmlFor="med-dosage">Dosage / Frequency (optional)</label>
              <input
                id="med-dosage"
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 81mg daily"
              />
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="row">
            <button className="btn-primary" type="submit" disabled={adding || !name.trim()}>
              {adding ? "Adding…" : "Add medication"}
            </button>
          </div>
        </form>

        <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "20px 0" }} />

        <h3>Active Medication List</h3>
        {loadingMeds ? (
          <p style={{ color: "#8a938f", fontSize: 14 }}>Loading your medications…</p>
        ) : medications.length === 0 ? (
          <p style={{ color: "#8a938f", fontSize: 14 }}>No medications added yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 20px" }}>
            {medications.map((med) => (
              <li
                key={med.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "var(--paper)",
                  borderRadius: 8,
                  marginBottom: 8,
                  border: "1px solid var(--line)",
                }}
              >
                <div>
                  <strong>{med.name}</strong>
                  {med.dosage && <span style={{ color: "#6b7773", marginLeft: 8, fontSize: 14 }}>({med.dosage})</span>}
                </div>
                <button
                  className="btn-ghost"
                  onClick={() => handleDelete(med.id)}
                  disabled={deletingId === med.id}
                  style={{ padding: "4px 10px", fontSize: 12, color: "var(--clay)" }}
                >
                  {deletingId === med.id ? "Removing…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="row">
          <button
            className="btn-primary"
            onClick={handleCheckInteractions}
            disabled={checking || medications.length === 0}
            style={{ background: medications.length === 0 ? undefined : "var(--deep-teal)" }}
          >
            {checking ? "Checking OpenFDA interactions…" : "Check interactions"}
          </button>
        </div>
      </div>

      {/* 2. Interaction Results Card */}
      {checkResult && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span
              className={`urgency-badge ${
                checkResult.has_interactions ? "urgency-seek_emergency_care" : "urgency-self_care"
              }`}
            >
              {checkResult.has_interactions ? "Potential Interactions / Warnings" : "No Major Interactions Detected"}
            </span>
          </div>

          <h3 style={{ marginTop: 12 }}>Interaction & Safety Analysis</h3>
          <div style={{ whiteSpace: "pre-line", lineHeight: 1.6, color: "#3f4c48" }}>
            {checkResult.analysis}
          </div>

          {checkResult.medications_checked.length > 0 && (
            <p style={{ fontSize: 12, color: "#8a938f", marginTop: 16 }}>
              Medications evaluated: {checkResult.medications_checked.join(", ")}
            </p>
          )}

          <p className="disclaimer">{checkResult.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
