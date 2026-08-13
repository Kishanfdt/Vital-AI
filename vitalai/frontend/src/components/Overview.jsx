import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SkeletonLines } from "./Spinner";

const API_URL = import.meta.env.VITE_API_URL;

const FEATURES = [
  {
    to: "/triage",
    icon: "🩺",
    title: "Symptom Check",
    desc: "Describe what you're feeling and get an urgency assessment with next steps.",
  },
  {
    to: "/chat",
    icon: "💬",
    title: "Coach Chat",
    desc: "Real-time streaming AI wellness coach for lifestyle, nutrition & stress guidance.",
  },
  {
    to: "/medications",
    icon: "💊",
    title: "Medications",
    desc: "Track your meds and check for drug-drug interactions via OpenFDA in one click.",
  },
  {
    to: "/documents",
    icon: "📄",
    title: "Documents Q&A",
    desc: "Upload a lab report or clinical note and ask questions — answers grounded in your document.",
  },
  {
    to: "/journal",
    icon: "📓",
    title: "Health Journal",
    desc: "Log daily health and mood entries; get AI-powered 30-day trend analysis.",
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* Truncates trend summary to ~2 sentences for the dashboard snippet */
function snippetify(text, maxLen = 220) {
  if (!text) return "";
  // Try to cut at a sentence boundary
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const cut = trimmed.lastIndexOf(".", maxLen);
  return cut > 60 ? trimmed.slice(0, cut + 1) + " …" : trimmed.slice(0, maxLen) + "…";
}

/* ── Live Trend Snippet Card ───────────────────────────────── */
function TrendSnippet({ token }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState(null);   // { total_entries, trend_summary, detected_clusters }
  const [empty, setEmpty] = useState(false);  // no entries yet

  useEffect(() => {
    let cancelled = false;
    async function fetchTrend() {
      try {
        const res = await fetch(`${API_URL}/journal/trends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (!cancelled) {
          if (data.total_entries === 0) {
            setEmpty(true);
          } else {
            setTrend(data);
          }
        }
      } catch {
        if (!cancelled) setEmpty(true); // treat error same as no data
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTrend();
    return () => { cancelled = true; };
  }, [token]);

  const cardStyle = {
    background: "var(--white)",
    border: "1px solid var(--line)",
    borderRadius: 14,
    padding: "20px 24px",
    marginBottom: 28,
    cursor: "pointer",
    transition: "box-shadow 0.18s ease, border-color 0.18s ease",
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 18 }} aria-hidden="true">📓</span>
          <strong style={{ fontSize: 14, color: "var(--deep-teal)" }}>Recent Wellness Trend</strong>
        </div>
        <SkeletonLines lines={3} />
      </div>
    );
  }

  if (empty) {
    return (
      <button
        style={{ ...cardStyle, width: "100%", textAlign: "left", border: "1px dashed var(--line)" }}
        onClick={() => navigate("/journal")}
        aria-label="Go to Health Journal to start tracking"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }} aria-hidden="true">📓</span>
          <strong style={{ fontSize: 14, color: "var(--deep-teal)" }}>Recent Wellness Trend</strong>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
          No journal entries yet — start logging how you feel to unlock AI-powered 30-day trend analysis.
        </p>
        <span style={{ display: "inline-block", marginTop: 12, fontSize: 13, fontWeight: 600, color: "var(--clay)" }}>
          Write your first entry →
        </span>
      </button>
    );
  }

  const snippet = snippetify(trend.trend_summary);
  const clusters = trend.detected_clusters || [];

  return (
    <button
      style={{ ...cardStyle, width: "100%", textAlign: "left" }}
      onClick={() => navigate("/journal")}
      aria-label="View full trend analysis in Health Journal"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }} aria-hidden="true">📓</span>
          <strong style={{ fontSize: 14, color: "var(--deep-teal)" }}>Recent Wellness Trend</strong>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 10px",
            background: "#e4efe8",
            color: "#2f6b4f",
            borderRadius: 999,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}
        >
          {trend.total_entries} {trend.total_entries === 1 ? "entry" : "entries"}
        </span>
      </div>

      {clusters.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {clusters.map((c, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 9px",
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 999,
                color: "var(--deep-teal)",
              }}
            >
              🏷️ {c}
            </span>
          ))}
        </div>
      )}

      <p style={{ fontSize: 13, color: "#3f4c48", margin: 0, lineHeight: 1.55 }}>{snippet}</p>

      <span style={{ display: "inline-block", marginTop: 10, fontSize: 12, fontWeight: 600, color: "var(--clay)" }}>
        View full analysis →
      </span>
    </button>
  );
}

/* ── Overview Page ──────────────────────────────────────────── */
export default function Overview({ userEmail, token }) {
  const navigate = useNavigate();
  const firstName = userEmail?.split("@")[0] ?? "there";

  return (
    <div>
      {/* Greeting */}
      <div className="overview-greeting">
        <h1>{getGreeting()}, {firstName} 👋</h1>
        <p>
          Welcome to VitalAI — your AI-powered health &amp; wellness platform.
        </p>
      </div>

      {/* Live trend snippet from /journal/trends */}
      <TrendSnippet token={token} />

      {/* Feature grid */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--deep-teal)", marginBottom: 14, letterSpacing: 0 }}>
        Your tools
      </h2>
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
