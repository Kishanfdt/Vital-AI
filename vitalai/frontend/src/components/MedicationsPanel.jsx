import { useEffect, useState } from "react";
import { Spinner, SkeletonLines } from "./Spinner";
import { useToast } from "./Toast";
import { EmptyState, EmptyMedications } from "./EmptyState";

const API_URL = import.meta.env.VITE_API_URL;

export default function MedicationsPanel({ token }) {
  const toast = useToast();
  const [medications, setMedications] = useState([]);
  const [name, setName]               = useState("");
  const [dosage, setDosage]           = useState("");
  const [loadingMeds, setLoadingMeds] = useState(true);
  const [adding, setAdding]           = useState(false);
  const [deletingId, setDeletingId]   = useState(null);
  const [checking, setChecking]       = useState(false);
  const [error, setError]             = useState("");
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => { fetchMedications(); }, [token]);

  async function fetchMedications() {
    setLoadingMeds(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/medications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to load medications (${response.status})`);
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), dosage: dosage.trim() || null }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || `Failed to add medication (${response.status})`);
      }
      setName("");
      setDosage("");
      await fetchMedications();
      toast(`${name.trim()} added to your medication list.`, "success");
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id, medName) {
    setDeletingId(id);
    setError("");
    try {
      const response = await fetch(`${API_URL}/medications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to delete (${response.status})`);
      setMedications((prev) => prev.filter((m) => m.id !== id));
      toast(`${medName} removed.`, "info");
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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || `Interaction check failed (${response.status})`);
      }
      const data = await response.json();
      setCheckResult(data);
      toast("Interaction check complete.", "success");
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="page-content">
      {/* Add Form */}
      <div className="card">
        <h2>My Medications</h2>
        <p>Track your current prescription and over-the-counter medications.</p>

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
              <label htmlFor="med-dosage">
                Dosage / Frequency{" "}
                <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.65 }}>
                  (optional)
                </span>
              </label>
              <input
                id="med-dosage"
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 81mg daily"
              />
            </div>
          </div>

          {error && <p className="error-text" role="alert">{error}</p>}

          <div className="row">
            <button className="btn-primary" type="submit" disabled={adding || !name.trim()}>
              {adding ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Spinner size="sm" /> Adding…
                </span>
              ) : "Add medication"}
            </button>
          </div>
        </form>

        <hr className="divider" />

        <h3 style={{ marginBottom: 14 }}>Active Medication List</h3>

        {loadingMeds ? (
          <div style={{ marginTop: 12 }}><SkeletonLines lines={3} /></div>
        ) : medications.length === 0 ? (
          <EmptyState
            illustration={EmptyMedications}
            message="No medications added yet — add your first one above."
          />
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px" }} aria-label="Medication list">
            {medications.map((med) => (
              <li key={med.id} className="med-item">
                <div>
                  <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{med.name}</span>
                  {med.dosage && (
                    <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: "var(--text-xs)" }}>
                      {med.dosage}
                    </span>
                  )}
                </div>
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(med.id, med.name)}
                  disabled={deletingId === med.id}
                  aria-label={`Remove ${med.name}`}
                  style={{ padding: "5px 11px", fontSize: "var(--text-xs)" }}
                >
                  {deletingId === med.id ? "Removing…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="row" style={{ marginTop: medications.length === 0 ? 0 : 4 }}>
          <button
            className="btn-primary"
            onClick={handleCheckInteractions}
            disabled={checking || medications.length === 0}
            aria-label="Check drug interactions for my current medications"
          >
            {checking ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Spinner size="sm" /> Checking OpenFDA…
              </span>
            ) : "Check interactions"}
          </button>
        </div>
      </div>

      {/* Interaction Results */}
      {checkResult && (
        <div className="card card-elevated">
          <span
            className={`urgency-badge ${
              checkResult.has_interactions ? "urgency-seek_emergency_care" : "urgency-self_care"
            }`}
          >
            {checkResult.has_interactions ? "Potential Interactions" : "No Major Interactions Detected"}
          </span>

          <h3 style={{ marginTop: 16 }}>Interaction &amp; Safety Analysis</h3>
          <p style={{ whiteSpace: "pre-line", lineHeight: "var(--lh-normal)" }}>
            {checkResult.analysis}
          </p>

          {checkResult.medications_checked.length > 0 && (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginTop: 14 }}>
              Evaluated: {checkResult.medications_checked.join(", ")}
            </p>
          )}

          <p className="disclaimer">{checkResult.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
