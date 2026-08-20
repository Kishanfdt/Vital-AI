import { useEffect, useState } from "react";
import { Spinner, SkeletonLines } from "./Spinner";
import { useToast } from "./Toast";
import { EmptyState, EmptyMedications } from "./EmptyState";
import { Pill, Trash2, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { formatRelativeTime, formatClinicalTimestamp } from "../utils/formatters";

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
  const [checkTime, setCheckTime]     = useState(null);

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
      toast(`${medName} removed from medication record.`, "info");
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
      setCheckTime(new Date().toISOString());
      toast("OpenFDA drug interaction check complete.", "success");
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="page-content">
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 20 }}>
        <span className="section-label">Prescription &amp; OTC Log</span>
        <h1>Active Medication Records</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Structured EHR medication list and OpenFDA cross-interaction analysis.
        </p>
      </div>

      {/* ── Add Medication Form & Table ── */}
      <div className="card">
        <span className="card-section-label">Log New Medication</span>
        <form onSubmit={handleAddMedication} style={{ marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label htmlFor="med-name">Medication Name *</label>
              <input
                id="med-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lisinopril, Aspirin, Metformin"
                required
              />
            </div>
            <div>
              <label htmlFor="med-dosage">Dosage &amp; Frequency (Optional)</label>
              <input
                id="med-dosage"
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 10mg daily, 81mg morning"
              />
            </div>
          </div>

          {error && <p className="error-text" role="alert">{error}</p>}

          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn-primary" type="submit" disabled={adding || !name.trim()}>
              {adding ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Spinner size="sm" /> Indexing Medication…
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Pill size={15} /> Add Medication Record
                </span>
              )}
            </button>
          </div>
        </form>

        <hr className="divider" />

        {/* ── Tabular EHR Medication List ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span className="card-section-label" style={{ margin: 0 }}>Active Prescriptions &amp; Supplements</span>
          <span className="timestamp-text">{medications.length} Recorded</span>
        </div>

        {loadingMeds ? (
          <SkeletonLines lines={3} />
        ) : medications.length === 0 ? (
          <EmptyState
            illustration={EmptyMedications}
            message="No active medications logged in patient chart. Add your first prescription above."
          />
        ) : (
          <div className="ehr-table-wrapper">
            <table className="ehr-table" aria-label="Active medication table">
              <thead>
                <tr>
                  <th>Medication Name</th>
                  <th>Dosage / Schedule</th>
                  <th>Date Added</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((med) => (
                  <tr key={med.id}>
                    <td style={{ fontWeight: 600, color: "var(--ink)" }}>{med.name}</td>
                    <td style={{ color: "#384643" }}>{med.dosage || "—"}</td>
                    <td className="timestamp-text">{formatRelativeTime(med.created_at)}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn-danger"
                        onClick={() => handleDelete(med.id, med.name)}
                        disabled={deletingId === med.id}
                        aria-label={`Remove ${med.name}`}
                        style={{ padding: "4px 8px", fontSize: 11 }}
                      >
                        {deletingId === med.id ? "Removing…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Check Interactions Action */}
        <div className="row" style={{ marginTop: 16 }}>
          <button
            className="btn-primary"
            onClick={handleCheckInteractions}
            disabled={checking || medications.length === 0}
            aria-label="Run OpenFDA drug interaction cross-check"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {checking ? (
              <>
                <Spinner size="sm" /> Querying OpenFDA Database…
              </>
            ) : (
              <>
                <ShieldAlert size={15} /> Run Drug Interaction Check
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Interaction Check Output (Clinical Alert Box) ── */}
      {checkResult && (
        <div
          className={`card-triage-accent ${
            checkResult.has_interactions ? "accent-seek_emergency_care" : "accent-self_care"
          }`}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {checkResult.has_interactions ? (
                <AlertTriangle size={18} style={{ color: "var(--danger)" }} />
              ) : (
                <CheckCircle2 size={18} style={{ color: "var(--success)" }} />
              )}
              <span
                className={`urgency-badge ${
                  checkResult.has_interactions ? "urgency-seek_emergency_care" : "urgency-self_care"
                }`}
              >
                {checkResult.has_interactions ? "Potential Interactions Detected" : "No Major Interactions Identified"}
              </span>
            </div>
            <span className="timestamp-text">OpenFDA Analysis · {formatClinicalTimestamp(checkTime)}</span>
          </div>

          <span className="card-section-label">Safety &amp; Interaction Rationale</span>
          <p style={{ whiteSpace: "pre-line", lineHeight: "var(--lh-normal)", margin: "4px 0 12px", color: "var(--ink)" }}>
            {checkResult.analysis}
          </p>

          {checkResult.medications_checked?.length > 0 && (
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>
              Medications evaluated: <strong>{checkResult.medications_checked.join(", ")}</strong>
            </p>
          )}

          <p className="disclaimer">
            {checkResult.disclaimer || "Drug interaction results are powered by OpenFDA API datasets for informational screening only. Always consult your prescribing physician or pharmacist before changing medication regimens."}
          </p>
        </div>
      )}
    </div>
  );
}
