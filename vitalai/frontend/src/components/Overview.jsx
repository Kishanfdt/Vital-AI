import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SkeletonLines } from "./Spinner";
import {
  Activity,
  Pill,
  BookOpen,
  CalendarDays,
  Sparkles,
  ChevronRight,
  Plus,
  FileText,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { formatRelativeTime, formatClinicalTimestamp } from "../utils/formatters";

const API_URL = import.meta.env.VITE_API_URL;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function snippetify(text, maxLen = 180) {
  if (!text) return "";
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const cut = t.lastIndexOf(".", maxLen);
  return cut > 40 ? t.slice(0, cut + 1) + " …" : t.slice(0, maxLen) + "…";
}

/* ── EHR Clinical Summary Widgets (Top Row) ─────────────────── */
function SummaryWidgets({ stats }) {
  return (
    <div className="ehr-summary-grid" aria-label="Patient summary metrics">
      <div className="ehr-stat-card">
        <div className="ehr-stat-icon" aria-hidden="true">
          <Pill size={16} strokeWidth={1.8} />
        </div>
        <div>
          <div className="ehr-stat-val">{stats?.medsCount ?? 0}</div>
          <div className="ehr-stat-lbl">Active Meds</div>
        </div>
      </div>

      <div className="ehr-stat-card">
        <div className="ehr-stat-icon" aria-hidden="true">
          <Activity size={16} strokeWidth={1.8} />
        </div>
        <div>
          <div className="ehr-stat-val">{stats?.triageCount ?? 0}</div>
          <div className="ehr-stat-lbl">Triage Checks</div>
        </div>
      </div>

      <div className="ehr-stat-card">
        <div className="ehr-stat-icon" aria-hidden="true">
          <BookOpen size={16} strokeWidth={1.8} />
        </div>
        <div>
          <div className="ehr-stat-val">{stats?.journalCount ?? 0}</div>
          <div className="ehr-stat-lbl">Health Logs</div>
        </div>
      </div>

      <div className="ehr-stat-card">
        <div className="ehr-stat-icon" aria-hidden="true">
          <CalendarDays size={16} strokeWidth={1.8} />
        </div>
        <div>
          <div className="ehr-stat-val">{stats?.apptsCount ?? 0}</div>
          <div className="ehr-stat-lbl">Care Events</div>
        </div>
      </div>
    </div>
  );
}

/* ── Timeline Activity Item ─────────────────────────────────── */
function ActivityItem({ item, navigate }) {
  const { Icon, title, subtitle, timestamp, to, badge, badgeClass } = item;

  return (
    <div className="timeline-item" onClick={() => navigate(to)} style={{ cursor: "pointer" }}>
      <div className="timeline-icon" aria-hidden="true">
        <Icon size={14} strokeWidth={1.8} />
      </div>
      <div className="timeline-body">
        <div className="timeline-meta">
          <span className="timeline-title">{title}</span>
          <span className="timestamp-text">{formatRelativeTime(timestamp)}</span>
        </div>
        <p style={{ fontSize: 13, color: "#384643", margin: "2px 0 0" }}>{subtitle}</p>
        {badge && (
          <div style={{ marginTop: 6 }}>
            <span className={`urgency-badge ${badgeClass}`}>{badge}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Clinical Insights Card (AI Agent Summary) ──────────────── */
function ClinicalInsightsCard({ token, navigate }) {
  const [loading, setLoading] = useState(true);
  const [trend, setTrend]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/journal/trends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled && data.total_entries > 0) {
          setTrend(data);
        }
      } catch {
        // silent fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="card card-triage-accent accent-teal" style={{ marginTop: 0, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="card-section-label" style={{ margin: 0 }}>Clinical Insights</span>
        <span className="ai-disclaimer-chip">
          <Sparkles size={11} /> AI-Generated
        </span>
      </div>

      {loading ? (
        <SkeletonLines lines={3} />
      ) : trend ? (
        <div>
          {trend.detected_clusters?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
              {trend.detected_clusters.map((c, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 8px",
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                    borderRadius: 4,
                    color: "var(--deep-teal)",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          <p style={{ fontSize: 13, lineHeight: "var(--lh-normal)", margin: "0 0 10px", color: "var(--ink)" }}>
            {snippetify(trend.trend_summary)}
          </p>
          <button
            className="btn-ghost"
            onClick={() => navigate("/journal")}
            style={{ fontSize: 12, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            Full Trend Analysis <ChevronRight size={13} />
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>
            No health trends synthesized yet. Log symptoms or journal entries to generate AI-assisted clinical observations.
          </p>
          <button
            className="btn-ghost"
            onClick={() => navigate("/journal")}
            style={{ fontSize: 12, padding: "4px 10px" }}
          >
            Start Journal Log
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main Overview / EHR Patient Summary Hub ───────────────── */
export default function Overview({ userEmail, token }) {
  const navigate  = useNavigate();
  const rawName   = userEmail?.split("@")[0] ?? "Patient";
  const firstName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const [stats, setStats]       = useState({ medsCount: 0, triageCount: 0, journalCount: 0, apptsCount: 0 });
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const h = { Authorization: `Bearer ${token}` };
      try {
        const [triageRes, medsRes, journalRes, apptsRes] = await Promise.all([
          fetch(`${API_URL}/triage/history`, { headers: h }).catch(() => null),
          fetch(`${API_URL}/medications`,      { headers: h }).catch(() => null),
          fetch(`${API_URL}/journal`,          { headers: h }).catch(() => null),
          fetch(`${API_URL}/appointments`,     { headers: h }).catch(() => null),
        ]);

        const triage  = (triageRes && triageRes.ok)  ? await triageRes.json()  : [];
        const meds    = (medsRes && medsRes.ok)      ? await medsRes.json()    : [];
        const journal = (journalRes && journalRes.ok)? await journalRes.json() : [];
        const appts   = (apptsRes && apptsRes.ok)    ? await apptsRes.json()   : [];

        if (cancelled) return;

        setStats({
          medsCount: meds.length,
          triageCount: triage.length,
          journalCount: journal.length,
          apptsCount: appts.length,
        });

        /* Build unified chronological activity timeline feed */
        const events = [];

        triage.slice(0, 5).forEach((t) => {
          events.push({
            id: `triage-${t.id}`,
            Icon: Activity,
            title: "Symptom Triage Assessment",
            subtitle: t.symptoms ? `Symptoms: ${snippetify(t.symptoms, 60)}` : "Symptom check completed",
            timestamp: t.created_at,
            to: "/triage",
            badge: t.urgency === "self_care" ? "Self Care" : t.urgency === "see_doctor_soon" ? "See Doctor" : "Emergency",
            badgeClass: `urgency-${t.urgency}`,
          });
        });

        journal.slice(0, 5).forEach((j) => {
          events.push({
            id: `journal-${j.id}`,
            Icon: BookOpen,
            title: "Health Journal Entry",
            subtitle: snippetify(j.content, 70),
            timestamp: j.created_at,
            to: "/journal",
          });
        });

        meds.slice(0, 5).forEach((m) => {
          events.push({
            id: `med-${m.id}`,
            Icon: Pill,
            title: `Medication Added: ${m.name}`,
            subtitle: m.dosage ? `Dosage: ${m.dosage}` : "Prescription logged",
            timestamp: m.created_at,
            to: "/medications",
          });
        });

        appts.slice(0, 5).forEach((a) => {
          events.push({
            id: `appt-${a.id}`,
            Icon: CalendarDays,
            title: `Appointment: ${a.provider_name}`,
            subtitle: a.reason ? `Reason: ${a.reason}` : "Care appointment scheduled",
            timestamp: a.appointment_date || a.created_at,
            to: "/appointments",
          });
        });

        // Sort descending by date
        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setTimeline(events.slice(0, 6));
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="page-content">
      {/* ── Page Title Header (Fraunces strictly used once here) ── */}
      <div className="overview-header">
        <span className="section-label">{formatDate()}</span>
        <h1>{getGreeting()}, {firstName}</h1>
        <p>EHR Patient Summary &amp; Clinical Care Portal.</p>
      </div>

      {/* ── Top Summary Widgets (EHR Style) ── */}
      <SummaryWidgets stats={stats} />

      {/* ── Desktop 2-Column Clinical Layout ── */}
      <div className="overview-2col">
        {/* Left Column: Recent Activity Timeline Feed */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="section-label" style={{ margin: 0 }}>Recent Activity Timeline</span>
            <span className="timestamp-text">Chronological Feed</span>
          </div>

          {loading ? (
            <div className="card"><SkeletonLines lines={5} /></div>
          ) : timeline.length === 0 ? (
            <div className="card" style={{ padding: "32px 20px", textTransform: "none" }}>
              <div className="empty-state">
                <Clock size={36} strokeWidth={1.4} style={{ color: "var(--muted)", marginBottom: 10 }} />
                <p style={{ margin: 0, fontSize: 13 }}>No recent clinical activity logged. Perform a symptom triage or log a journal entry to populate the patient chart timeline.</p>
              </div>
            </div>
          ) : (
            <div className="timeline-feed" aria-label="Recent patient activity timeline">
              {timeline.map((item) => (
                <ActivityItem key={item.id} item={item} navigate={navigate} />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Quick Actions + Clinical Insights */}
        <div>
          {/* Clinical AI Insights */}
          <ClinicalInsightsCard token={token} navigate={navigate} />

          {/* Quick Actions List */}
          <span className="section-label">Quick Actions</span>
          <div className="quick-actions-list" role="navigation" aria-label="Quick actions list">
            <button className="quick-action-item" onClick={() => navigate("/triage")}>
              <div className="quick-action-item-left">
                <Activity size={15} strokeWidth={1.8} style={{ color: "var(--deep-teal)" }} />
                <span>New Symptom Check</span>
              </div>
              <ChevronRight size={14} style={{ color: "var(--muted)" }} />
            </button>

            <button className="quick-action-item" onClick={() => navigate("/journal")}>
              <div className="quick-action-item-left">
                <BookOpen size={15} strokeWidth={1.8} style={{ color: "var(--deep-teal)" }} />
                <span>Log Journal Entry</span>
              </div>
              <ChevronRight size={14} style={{ color: "var(--muted)" }} />
            </button>

            <button className="quick-action-item" onClick={() => navigate("/documents")}>
              <div className="quick-action-item-left">
                <FileText size={15} strokeWidth={1.8} style={{ color: "var(--deep-teal)" }} />
                <span>Upload Medical Record</span>
              </div>
              <ChevronRight size={14} style={{ color: "var(--muted)" }} />
            </button>

            <button className="quick-action-item" onClick={() => navigate("/appointments")}>
              <div className="quick-action-item-left">
                <CalendarDays size={15} strokeWidth={1.8} style={{ color: "var(--deep-teal)" }} />
                <span>Schedule Care Visit</span>
              </div>
              <ChevronRight size={14} style={{ color: "var(--muted)" }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
