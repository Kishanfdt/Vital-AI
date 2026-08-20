import { useEffect, useState } from "react";
import { Spinner, SkeletonLines } from "./Spinner";
import { useToast } from "./Toast";
import { Calendar, Download, Plus, Pencil, Trash2, ChevronDown, ChevronUp, FileText, Clock } from "lucide-react";
import { formatRelativeTime, formatClinicalTimestamp } from "../utils/formatters";

const API_URL = import.meta.env.VITE_API_URL;

const EMPTY_FORM = { provider_name: "", appointment_date: "", reason: "", notes: "" };

function isUpcoming(dateStr) {
  return new Date(dateStr) >= new Date();
}

function formatApptDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/* ── Appointment Card ───────────────────────────────────────── */
function AppointmentCard({ appt, onDelete, onUpdateNotes, deleting, onDownloadPdf }) {
  const toast = useToast();
  const upcoming = isUpcoming(appt.appointment_date);
  const [editing, setEditing]     = useState(false);
  const [notes, setNotes]         = useState(appt.notes || "");
  const [saving, setSaving]       = useState(false);
  const [showNotes, setShowNotes] = useState(!!appt.notes);

  async function handleSaveNotes(e) {
    e.preventDefault();
    setSaving(true);
    await onUpdateNotes(appt.id, notes);
    setSaving(false);
    setEditing(false);
    toast("Visit notes saved to chart.", "success");
  }

  return (
    <div
      className={`card-triage-accent ${upcoming ? "accent-teal" : ""}`}
      style={{
        background: "#fff",
        border: "1px solid var(--line)",
        borderLeft: `4px solid ${upcoming ? "var(--deep-teal)" : "var(--line)"}`,
        marginBottom: 12,
        padding: "16px 20px",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              className={`status-badge ${upcoming ? "status-good" : ""}`}
              style={{ fontSize: 10, padding: "2px 6px" }}
            >
              {upcoming ? "UPCOMING VISIT" : "PAST RECORD"}
            </span>
            <span className="timestamp-text">
              {formatApptDate(appt.appointment_date)}
            </span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", marginBottom: 2 }}>
            {appt.provider_name}
          </div>
          <div style={{ fontSize: 13, color: "#384643" }}>
            Reason: {appt.reason}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            className="btn-ghost"
            onClick={() => { setEditing(!editing); setShowNotes(true); }}
            aria-label={editing ? "Cancel editing notes" : "Add or edit visit notes"}
            style={{ padding: "4px 8px", fontSize: 11 }}
          >
            <Pencil size={11} style={{ marginRight: 4 }} />
            {appt.notes ? "Edit Notes" : "Add Notes"}
          </button>
          <button
            className="btn-danger"
            onClick={() => onDelete(appt.id, appt.provider_name)}
            disabled={deleting === appt.id}
            aria-label={`Delete appointment with ${appt.provider_name}`}
            style={{ padding: "4px 8px", fontSize: 11 }}
          >
            {deleting === appt.id ? <Spinner size="sm" /> : <Trash2 size={11} />}
          </button>
        </div>
      </div>

      {/* Notes section */}
      {appt.notes && !editing && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed var(--line)" }}>
          <button
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 700, color: "var(--deep-teal)", textTransform: "uppercase", letterSpacing: "0.05em" }}
            onClick={() => setShowNotes(p => !p)}
          >
            {showNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Visit Notes
          </button>
          {showNotes && (
            <p style={{ marginTop: 6, fontSize: 13, color: "#384643",
              lineHeight: "var(--lh-normal)", background: "var(--paper)",
              borderRadius: "var(--radius-xs)", padding: "8px 10px", border: "1px solid var(--line)", margin: 0 }}>
              {appt.notes}
            </p>
          )}
        </div>
      )}

      {/* Edit notes form */}
      {editing && (
        <form onSubmit={handleSaveNotes} style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
          <label htmlFor={`notes-${appt.id}`} style={{ marginTop: 0 }}>Clinical Visit Notes</label>
          <textarea
            id={`notes-${appt.id}`}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Record doctor observations, diagnosis details, prescriptions, or follow-up instructions…"
            style={{ minHeight: 75 }}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn-primary" type="submit" disabled={saving} style={{ padding: "6px 12px", fontSize: 11 }}>
              {saving ? <><Spinner size="sm" /> Saving…</> : "Save Visit Notes"}
            </button>
            <button className="btn-ghost" type="button" onClick={() => setEditing(false)} style={{ padding: "6px 12px", fontSize: 11 }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ── Main Panel ──────────────────────────────────────────────── */
export default function AppointmentsPanel({ token }) {
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [submitting, setSubmitting]     = useState(false);
  const [deleting, setDeleting]         = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showPast, setShowPast]         = useState(false);
  const [error, setError]               = useState("");

  useEffect(() => { fetchAppointments(); }, [token]);

  async function fetchAppointments() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load appointments (${res.status})`);
      setAppointments(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Failed to add appointment (${res.status})`);
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      await fetchAppointments();
      toast(`Appointment with ${form.provider_name} added to schedule.`, "success");
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id, providerName) {
    setDeleting(id);
    try {
      const res = await fetch(`${API_URL}/appointments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
      setAppointments(prev => prev.filter(a => a.id !== id));
      toast(`Appointment with ${providerName} removed.`, "info");
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleUpdateNotes(id, notes) {
    try {
      const res = await fetch(`${API_URL}/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes.");
      const updated = await res.json();
      setAppointments(prev => prev.map(a => a.id === id ? updated : a));
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/appointments/summary-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `PDF generation failed (${res.status})`);
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `vitalai-clinical-summary-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("Clinical Visit Summary PDF downloaded.", "success");
    } catch (e) {
      setError(e.message);
      toast("PDF generation failed — try again.", "error");
    } finally {
      setDownloadingPdf(false);
    }
  }

  const upcoming = appointments.filter(a => isUpcoming(a.appointment_date));
  const past     = appointments.filter(a => !isUpcoming(a.appointment_date));

  return (
    <div className="page-content">
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 20 }}>
        <span className="section-label">Care Coordination</span>
        <h1>Care Visits &amp; Scheduling</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Schedule provider visits, log consultation notes, and export shareable clinical summaries.
        </p>
      </div>

      {/* ── Action Bar Card ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="card-section-label" style={{ margin: 0 }}>Care Actions</span>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "2px 0 0" }}>Manage appointments or export patient record PDF.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn-ghost"
              onClick={() => { setShowForm(p => !p); setError(""); }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} />
              {showForm ? "Cancel Form" : "Schedule Visit"}
            </button>

            {/* Prominent Clinical PDF Export Action */}
            <button
              className="btn-primary"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              aria-label="Generate and download health summary PDF"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {downloadingPdf ? (
                <>
                  <Spinner size="sm" /> Generating PDF…
                </>
              ) : (
                <>
                  <FileText size={15} /> Export Visit Summary (PDF)
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Add Appointment Form ── */}
        {showForm && (
          <form onSubmit={handleAdd} style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
            <span className="card-section-label">Schedule Care Visit</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label htmlFor="appt-provider">Provider / Clinic Name *</label>
                <input id="appt-provider" type="text" value={form.provider_name}
                  onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))}
                  placeholder="e.g. Dr. Sarah Patel, City Health Clinic" required />
              </div>
              <div>
                <label htmlFor="appt-date">Appointment Date &amp; Time *</label>
                <input id="appt-date" type="datetime-local" value={form.appointment_date}
                  onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
                  required />
              </div>
            </div>

            <label htmlFor="appt-reason">Reason for Visit *</label>
            <input id="appt-reason" type="text" value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="e.g. Annual physical exam, blood pressure follow-up" required />

            <label htmlFor="appt-notes">Pre-Visit Notes &amp; Symptoms (Optional)</label>
            <textarea id="appt-notes" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Questions for provider, recent symptom changes, medication questions…"
              style={{ minHeight: 70 }} />

            {error && <p className="error-text" role="alert">{error}</p>}

            <div className="row">
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? <><Spinner size="sm" /> Indexing Visit…</> : "Save Appointment"}
              </button>
            </div>
          </form>
        )}

        {!showForm && error && <p className="error-text" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      </div>

      {/* ── Appointment Timeline Lists ── */}
      {loading ? (
        <div className="card"><SkeletonLines lines={4} /></div>
      ) : appointments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Calendar size={42} strokeWidth={1.4} style={{ color: "var(--muted)", marginBottom: 12 }} />
            <p>No care visits logged in schedule. Click "Schedule Visit" above to add your first appointment.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Upcoming Section */}
          <div style={{ marginBottom: 24 }}>
            <span className="section-label" style={{ marginBottom: 12 }}>
              Upcoming Visits ({upcoming.length})
            </span>

            {upcoming.length === 0 ? (
              <div className="card" style={{ padding: "20px 24px" }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>No upcoming appointments scheduled.</p>
              </div>
            ) : (
              upcoming.map(a => (
                <AppointmentCard key={a.id} appt={a}
                  onDelete={handleDelete} onUpdateNotes={handleUpdateNotes} deleting={deleting} onDownloadPdf={handleDownloadPdf} />
              ))
            )}
          </div>

          {/* Past Appointments (Collapsible EHR Section) */}
          {past.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="section-label" style={{ margin: 0 }}>
                  Past Appointments History ({past.length})
                </span>
                <button
                  className="btn-ghost"
                  onClick={() => setShowPast(p => !p)}
                  style={{ padding: "3px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  {showPast ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showPast ? "Collapse History" : `Show ${past.length} Past Records`}
                </button>
              </div>

              {showPast && (
                <div>
                  {past.map(a => (
                    <AppointmentCard key={a.id} appt={a}
                      onDelete={handleDelete} onUpdateNotes={handleUpdateNotes} deleting={deleting} onDownloadPdf={handleDownloadPdf} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* PDF Clinical Disclaimer */}
      <p className="disclaimer" style={{ marginTop: 20 }}>
        Visit Summary PDFs are generated by VitalAI from patient health logs. They are provided to support clinician consultations and are not a substitute for official EHR records.
      </p>
    </div>
  );
}
