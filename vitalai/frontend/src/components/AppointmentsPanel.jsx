import { useEffect, useState } from "react";
import { Spinner, SkeletonLines } from "./Spinner";
import { useToast } from "./Toast";
import { Calendar, Download, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const EMPTY_FORM = { provider_name: "", appointment_date: "", reason: "", notes: "" };

function isUpcoming(dateStr) {
  return new Date(dateStr) >= new Date();
}

function formatApptDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/* ── Appointment Card ───────────────────────────────────────── */
function AppointmentCard({ appt, onDelete, onUpdateNotes, deleting }) {
  const toast = useToast();
  const upcoming = isUpcoming(appt.appointment_date);
  const [editing, setEditing]   = useState(false);
  const [notes, setNotes]       = useState(appt.notes || "");
  const [saving, setSaving]     = useState(false);
  const [showNotes, setShowNotes] = useState(!!appt.notes);

  async function handleSaveNotes(e) {
    e.preventDefault();
    setSaving(true);
    await onUpdateNotes(appt.id, notes);
    setSaving(false);
    setEditing(false);
    toast("Visit notes saved.", "success");
  }

  return (
    <div style={{
      background: "#fff", border: "1px solid var(--line)",
      borderRadius: "var(--radius-card)", padding: "18px 20px",
      marginBottom: 12, boxShadow: "var(--shadow-sm)",
      borderLeft: `3px solid ${upcoming ? "var(--deep-teal)" : "var(--line)"}`,
      transition: "box-shadow var(--duration-base) var(--ease-standard)",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px",
              borderRadius: 999, letterSpacing: "0.05em", textTransform: "uppercase",
              background: upcoming ? "rgba(15,61,58,0.09)" : "var(--line-light)",
              color: upcoming ? "var(--deep-teal)" : "var(--muted)",
            }}>
              {upcoming ? "Upcoming" : "Past"}
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
              {formatApptDate(appt.appointment_date)}
            </span>
          </div>
          <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--ink)", marginBottom: 2 }}>
            {appt.provider_name}
          </div>
          <div style={{ fontSize: "var(--text-sm)", color: "#3f4c48" }}>
            {appt.reason}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            className="btn-ghost"
            onClick={() => { setEditing(!editing); setShowNotes(true); }}
            aria-label={editing ? "Cancel editing notes" : "Add or edit visit notes"}
            style={{ padding: "5px 9px", fontSize: "var(--text-xs)" }}
          >
            <Pencil size={12} style={{ marginRight: 4 }} />
            {appt.notes ? "Edit notes" : "Add notes"}
          </button>
          <button
            className="btn-danger"
            onClick={() => onDelete(appt.id, appt.provider_name)}
            disabled={deleting === appt.id}
            aria-label={`Delete appointment with ${appt.provider_name}`}
            style={{ padding: "5px 9px", fontSize: "var(--text-xs)" }}
          >
            {deleting === appt.id ? <Spinner size="sm" /> : <Trash2 size={12} />}
          </button>
        </div>
      </div>

      {/* Notes section */}
      {appt.notes && !editing && (
        <div style={{ marginTop: 10 }}>
          <button
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--teal-soft)" }}
            onClick={() => setShowNotes(p => !p)}
          >
            {showNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Visit notes
          </button>
          {showNotes && (
            <p style={{ marginTop: 6, fontSize: "var(--text-sm)", color: "#3f4c48",
              lineHeight: "var(--lh-normal)", background: "var(--paper)",
              borderRadius: "var(--radius-xs)", padding: "8px 10px", border: "1px solid var(--line)" }}>
              {appt.notes}
            </p>
          )}
        </div>
      )}

      {/* Edit notes form */}
      {editing && (
        <form onSubmit={handleSaveNotes} style={{ marginTop: 12 }}>
          <label htmlFor={`notes-${appt.id}`} style={{ marginTop: 0 }}>Visit Notes</label>
          <textarea
            id={`notes-${appt.id}`}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="What happened at the visit? Any diagnoses, next steps, or follow-up needed?"
            style={{ minHeight: 80 }}
          />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn-primary" type="submit" disabled={saving} style={{ padding: "7px 14px", fontSize: "var(--text-xs)" }}>
              {saving ? <><Spinner size="sm" /> Saving…</> : "Save notes"}
            </button>
            <button className="btn-ghost" type="button" onClick={() => setEditing(false)} style={{ padding: "7px 14px", fontSize: "var(--text-xs)" }}>
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
      toast(`Appointment with ${form.provider_name} added.`, "success");
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
      a.download = `vitalaai-health-summary-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("Health summary PDF downloaded.", "success");
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
      {/* ── Header ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2>Care Coordination</h2>
            <p>Log appointments, add visit notes, and generate a shareable health summary for your doctor.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn-ghost"
              onClick={() => { setShowForm(p => !p); setError(""); }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} />
              {showForm ? "Cancel" : "Add appointment"}
            </button>
            <button
              className="btn-primary"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              aria-label="Generate and download health summary PDF"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {downloadingPdf ? <><Spinner size="sm" /> Generating PDF…</> : <><Download size={14} /> Visit Summary PDF</>}
            </button>
          </div>
        </div>

        {/* ── Add Appointment Form ── */}
        {showForm && (
          <form onSubmit={handleAdd} style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label htmlFor="appt-provider">Provider / Facility Name</label>
                <input id="appt-provider" type="text" value={form.provider_name}
                  onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))}
                  placeholder="e.g. Dr. Patel, City Clinic" required />
              </div>
              <div>
                <label htmlFor="appt-date">Appointment Date &amp; Time</label>
                <input id="appt-date" type="datetime-local" value={form.appointment_date}
                  onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
                  required />
              </div>
            </div>
            <label htmlFor="appt-reason">Reason for Visit</label>
            <input id="appt-reason" type="text" value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="e.g. Annual check-up, follow-up on blood pressure" required />
            <label htmlFor="appt-notes">
              Pre-Visit Notes{" "}
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.65 }}>(optional)</span>
            </label>
            <textarea id="appt-notes" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Questions for the doctor, symptoms to mention, recent changes…"
              style={{ minHeight: 70 }} />

            {error && <p className="error-text" role="alert">{error}</p>}

            <div className="row">
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? <><Spinner size="sm" /> Saving…</> : "Save appointment"}
              </button>
            </div>
          </form>
        )}

        {!showForm && error && <p className="error-text" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      </div>

      {/* ── Appointment Lists ── */}
      {loading ? (
        <div className="card"><SkeletonLines lines={4} /></div>
      ) : appointments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Calendar size={48} strokeWidth={1.2} style={{ color: "var(--sage)", marginBottom: 14 }} />
            <p>No appointments logged yet — add your first one above to start your care timeline.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <span className="section-label" style={{ marginBottom: 10, display: "block" }}>
                Upcoming ({upcoming.length})
              </span>
              {upcoming.map(a => (
                <AppointmentCard key={a.id} appt={a}
                  onDelete={handleDelete} onUpdateNotes={handleUpdateNotes} deleting={deleting} />
              ))}
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div style={{ marginTop: upcoming.length > 0 ? 20 : 0 }}>
              <span className="section-label" style={{ marginBottom: 10, display: "block" }}>
                Past Appointments ({past.length})
              </span>
              {past.map(a => (
                <AppointmentCard key={a.id} appt={a}
                  onDelete={handleDelete} onUpdateNotes={handleUpdateNotes} deleting={deleting} />
              ))}
            </div>
          )}
        </>
      )}

      {/* PDF disclaimer */}
      <p className="disclaimer" style={{ marginTop: 16 }}>
        Visit Summary PDFs are generated by VitalAI, an AI-assisted personal health tool.
        They are not a substitute for official medical records. Always consult a qualified
        healthcare professional for medical advice.
      </p>
    </div>
  );
}
