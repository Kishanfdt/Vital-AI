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
  RefreshCw,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

/* ── Status Badge ────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const config = {
    accepted: { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", label: "Active Caregiver", icon: CheckCircle },
    pending:  { bg: "#fffbeb", color: "#92400e", border: "#fde68a", label: "Pending Acceptance", icon: Clock },
    revoked:  { bg: "#fef2f2", color: "#991b1b", border: "#fecaca", label: "Revoked", icon: XCircle },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: "var(--text-xs)",
        fontWeight: 600,
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--deep-teal)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--deep-teal)", margin: 0, fontFamily: "var(--font-display)" }}>
                Shared Clinical Health Summary
              </h3>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>Caregiver Read-Only Access</span>
            </div>
          </div>

          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 18, padding: "4px 10px" }}>✕</button>
        </div>

        {/* Privacy Banner */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-xs)", color: "var(--muted)" }}>
          <Lock size={16} style={{ color: "var(--deep-teal)", flexShrink: 0 }} />
          <span><strong>Privacy Enforced:</strong> Raw health journal entries and documents remain private to the patient and are excluded from caregiver view.</span>
        </div>

        {loading ? (
          <SkeletonLines lines={6} />
        ) : error ? (
          <p style={{ color: "var(--clay)", fontSize: "var(--text-sm)" }}>{error}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Active Medications */}
            <div>
              <h4 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--deep-teal)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Pill size={15} /> Active Medications ({summary?.medications?.length ?? 0})
              </h4>
              {!summary?.medications?.length ? (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>No active medications listed.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {summary.medications.map((m) => (
                    <div key={m.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", padding: "10px 12px", borderRadius: "var(--radius-sm)" }}>
                      <strong style={{ fontSize: "var(--text-sm)", color: "var(--ink)", display: "block" }}>{m.name}</strong>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>{m.dosage || "Dosage not specified"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Appointments */}
            <div>
              <h4 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--deep-teal)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <CalendarDays size={15} /> Appointments ({summary?.appointments?.length ?? 0})
              </h4>
              {!summary?.appointments?.length ? (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>No appointments scheduled.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {summary.appointments.map((a) => (
                    <div key={a.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", padding: "12px 14px", borderRadius: "var(--radius-sm)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <strong style={{ fontSize: "var(--text-sm)", color: "var(--ink)" }}>{a.provider_name}</strong>
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--deep-teal)" }}>
                          {new Date(a.appointment_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)", margin: 0 }}>{a.reason}</p>
                      {a.notes && <p style={{ fontSize: "var(--text-xs)", color: "var(--ink)", marginTop: 6, fontStyle: "italic" }}>Notes: {a.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Triage History */}
            <div>
              <h4 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--deep-teal)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Activity size={15} /> Recent Symptom Triage Checks ({summary?.triage_history?.length ?? 0})
              </h4>
              {!summary?.triage_history?.length ? (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>No triage checks recorded.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {summary.triage_history.map((t) => (
                    <div key={t.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", padding: "12px 14px", borderRadius: "var(--radius-sm)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <strong style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                          {new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </strong>
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, textTransform: "capitalize", color: t.urgency === "seek_emergency_care" ? "#a5432a" : t.urgency === "see_doctor_soon" ? "#b8823a" : "#3d7a5c" }}>
                          {t.urgency.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--ink)", margin: "0 0 4px", fontWeight: 600 }}>Symptoms: {t.symptoms}</p>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)", margin: 0 }}>{t.reasoning}</p>
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
      toast("Access status updated.", "success");
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
      toast("Data export downloaded!", "success");
    } catch (err) {
      toast("Failed to export data.", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-content">
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1>Care Circle &amp; Family Sharing</h1>
        <p>Grant trusted family members or caregivers permissioned, read-only access to your health summary.</p>
      </div>

      {/* ── Invite Form Card ── */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--deep-teal)", marginBottom: 4, fontFamily: "var(--font-display)" }}>
          Invite a Caregiver or Family Member
        </h3>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginBottom: 16 }}>
          Enter their email address to grant read-only visibility into your triage history, active medications, and appointments.
        </p>

        <form onSubmit={handleInvite} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="email"
            placeholder="caregiver@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ flex: "1 1 260px", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", fontSize: "var(--text-sm)", background: "var(--white)", color: "var(--ink)" }}
          />
          <button type="submit" className="btn-primary" disabled={inviting} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <UserPlus size={15} />
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </form>
      </div>

      {/* ── Care Circle Lists ── */}
      {loading ? (
        <div className="card"><SkeletonLines lines={5} /></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 28 }}>
          {/* People You Share With */}
          <div className="card">
            <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--deep-teal)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} /> Care Circle You Manage ({data.shared_by_me.length})
            </h3>
            {!data.shared_by_me.length ? (
              <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)", margin: 0 }}>You have not invited any caregivers yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.shared_by_me.map((item) => (
                  <div key={item.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <strong style={{ fontSize: "var(--text-sm)", color: "var(--ink)", display: "block" }}>{item.invited_email}</strong>
                      <div style={{ marginTop: 4 }}>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>

                    {item.status !== "revoked" && (
                      <button className="btn-ghost" onClick={() => handleRevoke(item.id)} style={{ fontSize: "var(--text-xs)", color: "var(--clay)", padding: "4px 8px" }}>
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
            <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--deep-teal)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={16} /> Shared With You ({data.shared_with_me.length})
            </h3>
            {!data.shared_with_me.length ? (
              <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)", margin: 0 }}>No one has shared their health summary with you yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.shared_with_me.map((item) => (
                  <div key={item.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <strong style={{ fontSize: "var(--text-sm)", color: "var(--ink)", display: "block" }}>Patient ID: {item.owner_user_id.slice(0, 8)}…</strong>
                      <div style={{ marginTop: 4 }}>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {item.status === "pending" && (
                        <button className="btn-primary" onClick={() => handleAccept(item.id)} style={{ fontSize: "var(--text-xs)", padding: "5px 10px" }}>
                          Accept
                        </button>
                      )}
                      {item.status === "accepted" && (
                        <button className="btn-secondary" onClick={() => setActiveModalOwner(item.owner_user_id)} style={{ fontSize: "var(--text-xs)", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Eye size={13} /> View Summary
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

      {/* ── Data Portability / Export Section (Phase J) ── */}
      <div className="card" style={{ background: "linear-gradient(180deg, var(--white) 0%, var(--paper) 100%)", border: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--deep-teal)", margin: "0 0 4px 0", fontFamily: "var(--font-display)" }}>
              Data Ownership &amp; Export
            </h3>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)", margin: 0 }}>
              Download your complete personal health record (triage, journal, meds, appointments, document metadata) in standard JSON format.
            </p>
          </div>

          <button className="btn-secondary" onClick={handleExportData} disabled={exporting} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Download size={15} />
            {exporting ? "Preparing Export..." : "Export Complete Record (JSON)"}
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
