import { useEffect, useState } from "react";
import { SkeletonLines } from "./Spinner";
import { useToast } from "./Toast";
import {
  Users,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Eye,
  Download,
  Activity,
  Pill,
  CalendarDays,
  Lock,
  X,
} from "lucide-react";
import { formatRelativeTime, formatClinicalTimestamp } from "../utils/formatters";

const API_URL = import.meta.env.VITE_API_URL;

/* ── Status Badge ────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const config = {
    accepted: { bg: "var(--success-bg)", color: "var(--success)", border: "var(--success-border)", label: "Active Caregiver", icon: CheckCircle },
    pending:  { bg: "var(--warning-bg)", color: "var(--warning)", border: "var(--warning-border)", label: "Pending Acceptance", icon: Clock },
    revoked:  { bg: "var(--danger-bg)", color: "var(--danger)", border: "var(--danger-border)", label: "Revoked", icon: XCircle },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        padding: "3px 9px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <Icon size={12} />
      {c.label}
    </span>
  );
}

/* ── Shared Clinical Summary Modal ───────────────────────────── */
function SummaryModal({ ownerId, onClose, token }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch(`${API_URL}/care-circle/${ownerId}/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.detail || "Failed to load shared summary.");
        }
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        setError(err.message || "Failed to load caregiver summary.");
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, [ownerId, token]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(15, 61, 58, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--white)",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow-lg)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: "var(--deep-teal)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={16} />
            </div>
            <div>
              <span className="card-section-label" style={{ margin: 0, color: "var(--ink)" }}>Shared Clinical Record</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Caregiver Read-Only Access</span>
            </div>
          </div>

          <button className="btn-ghost" onClick={onClose} style={{ padding: "4px 8px" }}>
            <X size={16} />
          </button>
        </div>

        {/* Privacy Banner */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", padding: "10px 12px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--muted)" }}>
          <Lock size={15} style={{ color: "var(--deep-teal)", flexShrink: 0 }} />
          <span><strong>Privacy Enforced:</strong> Raw health journal notes and private document files are excluded from caregiver summary views.</span>
        </div>

        {loading ? (
          <SkeletonLines lines={6} />
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Active Medications */}
            <div>
              <span className="card-section-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Pill size={14} /> Active Prescriptions ({summary?.medications?.length ?? 0})
              </span>
              {!summary?.medications?.length ? (
                <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>No active medications listed.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {summary.medications.map((m) => (
                    <div key={m.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", padding: "10px 12px", borderRadius: "var(--radius-xs)" }}>
                      <strong style={{ fontSize: 13, color: "var(--ink)", display: "block" }}>{m.name}</strong>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{m.dosage || "Dosage not specified"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Appointments */}
            <div>
              <span className="card-section-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <CalendarDays size={14} /> Care Visits ({summary?.appointments?.length ?? 0})
              </span>
              {!summary?.appointments?.length ? (
                <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>No care visits scheduled.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {summary.appointments.map((a) => (
                    <div key={a.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", padding: "10px 12px", borderRadius: "var(--radius-xs)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <strong style={{ fontSize: 13, color: "var(--ink)" }}>{a.provider_name}</strong>
                        <span className="timestamp-text">
                          {new Date(a.appointment_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>{a.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Triage History */}
            <div>
              <span className="card-section-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Activity size={14} /> Triage Checks ({summary?.triage_history?.length ?? 0})
              </span>
              {!summary?.triage_history?.length ? (
                <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>No triage assessments recorded.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {summary.triage_history.map((t) => (
                    <div key={t.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", padding: "10px 12px", borderRadius: "var(--radius-xs)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span className="timestamp-text">
                          {formatClinicalTimestamp(t.created_at)}
                        </span>
                        <span className={`urgency-badge urgency-${t.urgency}`} style={{ fontSize: 10 }}>
                          {t.urgency.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--ink)", margin: "0 0 2px", fontWeight: 600 }}>Symptoms: {t.symptoms}</p>
                      <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>{t.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main CareCirclePanel Component ─────────────────────────── */
export default function CareCirclePanel({ token, userEmail }) {
  const toast = useToast();
  const [email, setEmail]               = useState("");
  const [inviting, setInviting]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [data, setData]                 = useState({ shared_by_me: [], shared_with_me: [] });
  const [activeModalOwner, setActiveModalOwner] = useState(null);
  const [exporting, setExporting]       = useState(false);

  const fetchCareCircle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/care-circle`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load care circle");
      const json = await res.json();
      setData(json);
    } catch (e) {
      toast("Failed to load care circle.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCareCircle();
  }, [token]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`${API_URL}/care-circle/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: email.trim() }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.detail || "Invitation failed.");
      toast(resJson.message || "Invitation sent!", "success");
      setEmail("");
      fetchCareCircle();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setInviting(false);
    }
  };

  const handleAccept = async (inviteId) => {
    try {
      const res = await fetch(`${API_URL}/care-circle/accept/${inviteId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to accept");
      toast("Invitation accepted!", "success");
      fetchCareCircle();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const handleRevoke = async (inviteId) => {
    try {
      const res = await fetch(`${API_URL}/care-circle/revoke/${inviteId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to revoke access");
      toast("Caregiver permissions updated.", "success");
      fetchCareCircle();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_URL}/export/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vitalai_health_export_${userEmail.split("@")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast("Patient health record exported (JSON).", "success");
    } catch (err) {
      toast("Failed to export data.", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-content">
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 20 }}>
        <span className="section-label">Care Access Control</span>
        <h1>Care Circle &amp; Family Sharing</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Grant permissioned, read-only summary visibility to designated family members or healthcare proxies.
        </p>
      </div>

      {/* ── Invite Form Card ── */}
      <div className="card">
        <span className="card-section-label">Add Caregiver Permission</span>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
          Enter caregiver email address to issue a permissioned read-only summary invitation.
        </p>

        <form onSubmit={handleInvite} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="email"
            placeholder="caregiver@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ flex: "1 1 260px" }}
          />
          <button type="submit" className="btn-primary" disabled={inviting} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <UserPlus size={15} />
            {inviting ? "Sending Invitation…" : "Issue Caregiver Invite"}
          </button>
        </form>
      </div>

      {/* ── Care Circle Lists ── */}
      {loading ? (
        <div className="card"><SkeletonLines lines={5} /></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 24 }}>
          {/* People You Share With */}
          <div className="card">
            <span className="card-section-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Users size={15} /> Authorized Caregivers ({data.shared_by_me.length})
            </span>
            {!data.shared_by_me.length ? (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>No caregiver access granted yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.shared_by_me.map((item) => (
                  <div key={item.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <strong style={{ fontSize: 13, color: "var(--ink)", display: "block" }}>{item.invited_email}</strong>
                      <div style={{ marginTop: 4 }}>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>

                    {item.status !== "revoked" && (
                      <button className="btn-danger" onClick={() => handleRevoke(item.id)} style={{ fontSize: 11, padding: "3px 8px" }}>
                        Revoke Access
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summaries Shared With You */}
          <div className="card">
            <span className="card-section-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Shield size={15} /> Records Shared With You ({data.shared_with_me.length})
            </span>
            {!data.shared_with_me.length ? (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>No patient records shared with your account.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.shared_with_me.map((item) => (
                  <div key={item.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <strong style={{ fontSize: 13, color: "var(--ink)", display: "block" }}>Patient Record ID: {item.owner_user_id.slice(0, 8)}…</strong>
                      <div style={{ marginTop: 4 }}>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {item.status === "pending" && (
                        <button className="btn-primary" onClick={() => handleAccept(item.id)} style={{ fontSize: 11, padding: "4px 8px" }}>
                          Accept Invite
                        </button>
                      )}
                      {item.status === "accepted" && (
                        <button className="btn-ghost" onClick={() => setActiveModalOwner(item.owner_user_id)} style={{ fontSize: 11, padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Eye size={12} /> View Summary
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Data Portability / Export Section ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <span className="card-section-label" style={{ margin: 0 }}>Data Ownership &amp; Portability</span>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>
              Export complete patient health records (triage checks, journal notes, medications, appointments) in structured JSON format.
            </p>
          </div>

          <button className="btn-ghost" onClick={handleExportData} disabled={exporting} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Download size={14} />
            {exporting ? "Packaging Export…" : "Export Record (JSON)"}
          </button>
        </div>
      </div>

      {/* Shared Summary Modal */}
      {activeModalOwner && (
        <SummaryModal ownerId={activeModalOwner} onClose={() => setActiveModalOwner(null)} token={token} />
      )}
    </div>
  );
}
