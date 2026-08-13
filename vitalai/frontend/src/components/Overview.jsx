import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SkeletonLines } from "./Spinner";
import { BarChart2, Activity, Pill, BookOpen } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const FEATURES = [
  {
    to: "/triage",
    icon: "🩺",
    title: "Symptom Check",
    desc: "Urgency assessment with structured next steps.",
  },
  {
    to: "/chat",
    icon: "💬",
    title: "Coach Chat",
    desc: "Streaming AI guidance for lifestyle & nutrition.",
  },
  {
    to: "/medications",
    icon: "💊",
    title: "Medications",
    desc: "Track meds and check drug interactions via OpenFDA.",
  },
  {
    to: "/documents",
    icon: "📄",
    title: "Documents Q&A",
    desc: "Grounded Q&A over your uploaded clinical documents.",
  },
  {
    to: "/journal",
    icon: "📓",
    title: "Health Journal",
    desc: "Log entries and get AI-powered 30-day trend analysis.",
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function snippetify(text, maxLen = 210) {
  if (!text) return "";
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const cut = t.lastIndexOf(".", maxLen);
  return cut > 60 ? t.slice(0, cut + 1) + " …" : t.slice(0, maxLen) + "…";
}

/* ── Live Trend Card ─────────────────────────────────────────── */
function TrendCard({ token }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trend, setTrend]   = useState(null);
  const [empty, setEmpty]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/journal/trends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) {
          if (data.total_entries === 0) setEmpty(true);
          else setTrend(data);
        }
      } catch {
        if (!cancelled) setEmpty(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="trend-snippet-card" style={{ cursor: "default" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--deep-teal)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Recent Wellness Trend
          </span>
        </div>
        <SkeletonLines lines={3} />
      </div>
    );
  }

  if (empty) {
    return (
      <button
        className="trend-snippet-card empty"
        onClick={() => navigate("/journal")}
        aria-label="Go to Health Journal to start tracking"
      >
        <p style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--teal-soft)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
          Recent Wellness Trend
        </p>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          No journal entries yet — start logging how you feel to unlock AI-powered 30-day trend analysis.
        </p>
        <span style={{ display: "inline-block", marginTop: 10, fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--clay)", letterSpacing: "0.02em" }}>
          Write your first entry →
        </span>
      </button>
    );
  }

  const snippet  = snippetify(trend.trend_summary);
  const clusters = trend.detected_clusters || [];

  return (
    <button
      className="trend-snippet-card"
      onClick={() => navigate("/journal")}
      aria-label="View full trend analysis in Health Journal"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--teal-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Recent Wellness Trend
        </span>
        <span className="urgency-badge urgency-self_care" style={{ fontSize: 10 }}>
          {trend.total_entries} {trend.total_entries === 1 ? "entry" : "entries"}
        </span>
      </div>

      {clusters.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {clusters.map((c, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 8px",
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 999,
                color: "var(--deep-teal)",
              }}
            >
              🏷 {c}
            </span>
          ))}
        </div>
      )}

      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "#3f4c48", lineHeight: "var(--lh-normal)" }}>
        {snippet}
      </p>

      <span style={{ display: "inline-block", marginTop: 10, fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--clay)", letterSpacing: "0.02em" }}>
        View full analysis →
      </span>
    </button>
  );
}

/* ── Mini Insights Widget (Overview condensed) ──────────────── */
function MiniInsights({ token }) {
  const navigate = useNavigate();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const h = { Authorization: `Bearer ${token}` };
      try {
        const [triageRes, medsRes, journalRes] = await Promise.all([
          fetch(`${API_URL}/triage/history`, { headers: h }),
          fetch(`${API_URL}/medications`,    { headers: h }),
          fetch(`${API_URL}/journal`,        { headers: h }),
        ]);
        const [triage, meds, journal] = await Promise.all([
          triageRes.ok  ? triageRes.json()  : [],
          medsRes.ok    ? medsRes.json()    : [],
          journalRes.ok ? journalRes.json() : [],
        ]);
        if (!cancelled) {
          const now = new Date();
          const ym  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          setStats({
            triageCount:   triage.length,
            medsCount:     meds.length,
            journalMonth:  journal.filter(e => e.created_at?.startsWith(ym)).length,
          });
        }
      } catch { /* silent — widget is non-critical */ }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  const mini = {
    background: "#fff", border: "1px solid var(--line)",
    borderRadius: "var(--radius-card)", padding: "18px 20px",
    marginBottom: 20, boxShadow: "var(--shadow-sm)",
  };

  if (loading) return (
    <div style={mini}>
      <SkeletonLines lines={2} />
    </div>
  );

  if (!stats) return null;

  return (
    <button style={{ ...mini, width: "100%", textAlign: "left", cursor: "pointer", transition: "box-shadow var(--duration-base) var(--ease-standard)" }}
      onClick={() => navigate("/insights")}
      aria-label="View full Insights & Analytics dashboard"
      onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "var(--shadow-sm)"}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart2 size={14} strokeWidth={2} style={{ color: "var(--teal-soft)" }} />
          <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--teal-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Insights at a Glance
          </span>
        </div>
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--clay)" }}>View all →</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          { Icon: Activity, label: "Triage checks", value: stats.triageCount, sub: "last 90 days", color: "var(--deep-teal)" },
          { Icon: Pill,     label: "Medications",   value: stats.medsCount,   sub: "active",       color: "#b8823a" },
          { Icon: BookOpen, label: "Journal entries", value: stats.journalMonth, sub: "this month", color: "var(--success)" },
        ].map(({ Icon, label, value, sub, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color }}>
              <Icon size={14} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontFamily: "var(--font-display)", fontWeight: 500, lineHeight: 1, color: "var(--ink)", marginBottom: 2 }}>{value}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)", lineHeight: 1.3 }}>{label}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </button>
  );
}

/* ── Overview / Health Summary Hub ─────────────────────────── */
export default function Overview({ userEmail, token }) {
  const navigate   = useNavigate();
  const firstName  = userEmail?.split("@")[0] ?? "there";

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div className="overview-header">
        <p className="overview-date">{formatDate()}</p>
        <h1>{getGreeting()}, {firstName}</h1>
        <p>Here's your health summary for today.</p>
      </div>

      {/* ── Quick Triage Entry ── */}
      <button
        className="feeling-card"
        onClick={() => navigate("/triage")}
        aria-label="Check your symptoms now"
      >
        <div className="feeling-card-left">
          <h3>How are you feeling today?</h3>
          <p>Tap to get an AI symptom assessment in under 30 seconds.</p>
        </div>
        <div className="feeling-pill-group" aria-hidden="true">
          <span className="feeling-pill">Good</span>
          <span className="feeling-pill">OK</span>
          <span className="feeling-pill">Not great</span>
        </div>
      </button>

      {/* ── Live Wellness Trend ── */}
      <TrendCard token={token} />

      {/* ── Live Insights Mini-Widget ── */}
      <MiniInsights token={token} />

      {/* ── Feature Grid ── */}
      <span className="section-label">Your tools</span>
      <div className="feature-grid">
        {FEATURES.map(({ to, icon, title, desc }) => (
          <button
            key={to}
            className="feature-card"
            onClick={() => navigate(to)}
            aria-label={`Go to ${title}`}
          >
            <span className="feature-card-icon" aria-hidden="true">{icon}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
