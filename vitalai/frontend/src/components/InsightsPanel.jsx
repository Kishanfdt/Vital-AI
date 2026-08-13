import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { SkeletonLines } from "./Spinner";
import { TrendingUp, Pill, BookOpen, Activity } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

/* ── Colour constants (from design tokens) ────────────────── */
const C = {
  self_care:             "#3d7a5c",
  see_doctor_soon:       "#b8823a",
  seek_emergency_care:   "#a5432a",
  journal:               "#0f3d3a",
  area_journal:          "#2d5c56",
};

const URGENCY_LABEL = {
  self_care:             "Self Care",
  see_doctor_soon:       "See Doctor",
  seek_emergency_care:   "Emergency",
};

/* ── Helpers ─────────────────────────────────────────────── */
function dateKey(isoString) {
  return isoString?.slice(0, 10) ?? "";
}

/** Collapse flat triage records into [{date, self_care, see_doctor_soon, seek_emergency_care}] */
function buildUrgencyChartData(records) {
  const map = {};
  records.forEach(r => {
    const d = dateKey(r.created_at);
    if (!map[d]) map[d] = { date: d, self_care: 0, see_doctor_soon: 0, seek_emergency_care: 0 };
    if (r.urgency in map[d]) map[d][r.urgency]++;
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

/** Collapse flat journal records into [{date, count}] for a simple area chart */
function buildJournalChartData(records) {
  const map = {};
  records.forEach(r => {
    const d = dateKey(r.created_at);
    map[d] = (map[d] ?? 0) + 1;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

function currentMonthCount(records) {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return records.filter(r => dateKey(r.created_at).startsWith(ym)).length;
}

/* ── Custom tooltip (shared) ─────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid var(--line)",
      borderRadius: 8, padding: "8px 12px",
      boxShadow: "var(--shadow-md)", fontSize: "var(--text-xs)",
    }}>
      <strong style={{ display: "block", marginBottom: 4, color: "var(--ink)" }}>{label}</strong>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {URGENCY_LABEL[p.dataKey] ?? p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

/* ── Stat card ─────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = "var(--deep-teal)" }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid var(--line)",
      borderRadius: "var(--radius-card)", padding: "18px 20px",
      boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "flex-start", gap: 14,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: "var(--paper)", display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, color,
      }}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <div>
        <div style={{ fontSize: "var(--text-2xl)", fontFamily: "var(--font-display)", fontWeight: 500, lineHeight: 1, color: "var(--ink)", marginBottom: 4 }}>
          {value ?? "—"}
        </div>
        <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────── */
function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--deep-teal)", marginBottom: 2, fontFamily: "var(--font-body)", letterSpacing: 0 }}>
        {title}
      </h3>
      {sub && <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)", margin: 0 }}>{sub}</p>}
    </div>
  );
}

/* ── Empty chart placeholder ─────────────────────────────── */
function ChartEmpty({ message }) {
  return (
    <div style={{
      height: 180, display: "flex", alignItems: "center", justifyContent: "center",
      border: "1px dashed var(--line)", borderRadius: "var(--radius-sm)",
      color: "var(--muted)", fontSize: "var(--text-xs)", textAlign: "center", padding: 24,
    }}>
      {message}
    </div>
  );
}

/* ── Medication timeline ─────────────────────────────────── */
function MedTimeline({ medications }) {
  if (!medications.length) {
    return <ChartEmpty message="No medications tracked yet — add one in the Medications section." />;
  }
  const sorted = [...medications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {sorted.map((med, i) => (
        <div key={med.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, paddingBottom: 14, position: "relative" }}>
          {/* Timeline line */}
          {i < sorted.length - 1 && (
            <div style={{ position: "absolute", left: 7, top: 20, bottom: 0, width: 2, background: "var(--line)", borderRadius: 1 }} />
          )}
          {/* Dot */}
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--sage)", border: "2px solid var(--deep-teal)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--ink)" }}>{med.name}</span>
            {med.dosage && <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginLeft: 8 }}>{med.dosage}</span>}
            <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginTop: 2 }}>
              Added {new Date(med.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Cluster tag cloud ───────────────────────────────────── */
function ClusterCloud({ clusters }) {
  if (!clusters?.length) {
    return <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)", margin: 0 }}>No clusters detected yet — at least 3 journal entries with embeddings are needed.</p>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {clusters.map((c, i) => (
        <span key={i} style={{
          background: "var(--paper)", border: "1px solid var(--line)",
          borderRadius: 999, padding: "5px 14px",
          fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--deep-teal)",
        }}>
          🏷 {c}
        </span>
      ))}
    </div>
  );
}

/* ── Main InsightsPanel ──────────────────────────────────── */
export default function InsightsPanel({ token }) {
  const navigate = useNavigate();

  const [triageHistory,  setTriageHistory]  = useState([]);
  const [medications,    setMedications]    = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalTrends,  setJournalTrends]  = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      setError("");
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [triageRes, medsRes, journalRes, trendsRes] = await Promise.all([
          fetch(`${API_URL}/triage/history`,  { headers }),
          fetch(`${API_URL}/medications`,      { headers }),
          fetch(`${API_URL}/journal`,          { headers }),
          fetch(`${API_URL}/journal/trends`,   { headers }),
        ]);

        const [triage, meds, journal, trends] = await Promise.all([
          triageRes.ok   ? triageRes.json()  : [],
          medsRes.ok     ? medsRes.json()    : [],
          journalRes.ok  ? journalRes.json() : [],
          trendsRes.ok   ? trendsRes.json()  : null,
        ]);

        if (!cancelled) {
          setTriageHistory(triage);
          setMedications(meds);
          setJournalEntries(journal);
          setJournalTrends(trends);
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load insights data. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, [token]);

  /* Derived chart data */
  const urgencyChartData  = useMemo(() => buildUrgencyChartData(triageHistory), [triageHistory]);
  const journalChartData  = useMemo(() => buildJournalChartData(journalEntries), [journalEntries]);
  const journalThisMonth  = useMemo(() => currentMonthCount(journalEntries), [journalEntries]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="card">
          <h2>Insights &amp; Analytics</h2>
          <SkeletonLines lines={6} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="card">
          <p className="error-text" role="alert">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1>Insights &amp; Analytics</h1>
        <p>Your personal health story, visualised across all tools.</p>
      </div>

      {/* ── Summary stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard
          icon={Activity}
          label="Triage Checks"
          value={triageHistory.length}
          sub="Last 90 days"
          color="var(--deep-teal)"
        />
        <StatCard
          icon={Pill}
          label="Current Medications"
          value={medications.length}
          sub="Active"
          color="#b8823a"
        />
        <StatCard
          icon={BookOpen}
          label="Journal Entries"
          value={journalThisMonth}
          sub="This month"
          color="var(--success)"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Journal Entries"
          value={journalEntries.length}
          sub="All time"
          color="#7fa896"
        />
      </div>

      {/* ── Triage urgency chart ── */}
      <div className="card">
        <SectionHeader
          title="Symptom Check History"
          sub="Frequency of urgency levels over the last 90 days"
        />
        {urgencyChartData.length === 0 ? (
          <ChartEmpty message="No triage checks recorded yet — use the Symptom Check tool to start tracking." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={urgencyChartData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v.slice(5)} /* show MM-DD */
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "var(--text-xs)", paddingTop: 10 }}
                formatter={v => URGENCY_LABEL[v] ?? v}
              />
              <Bar dataKey="self_care"           stackId="u" fill={C.self_care}           radius={[0,0,0,0]} />
              <Bar dataKey="see_doctor_soon"     stackId="u" fill={C.see_doctor_soon}     radius={[0,0,0,0]} />
              <Bar dataKey="seek_emergency_care" stackId="u" fill={C.seek_emergency_care} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Journal entries per day ── */}
      <div className="card">
        <SectionHeader
          title="Journal Activity"
          sub="Number of entries logged per day"
        />
        {journalChartData.length === 0 ? (
          <ChartEmpty message="No journal entries yet — write your first one in the Health Journal." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={journalChartData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="journalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.journal} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.journal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v.slice(5)}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={({ active, payload, label }) => (
                active && payload?.length ? (
                  <div style={{ background:"#fff", border:"1px solid var(--line)", borderRadius:8, padding:"8px 12px", boxShadow:"var(--shadow-md)", fontSize:"var(--text-xs)" }}>
                    <strong>{label}</strong><br />
                    Entries: <strong>{payload[0].value}</strong>
                  </div>
                ) : null
              )} />
              <Area
                type="monotone"
                dataKey="count"
                stroke={C.journal}
                strokeWidth={2}
                fill="url(#journalGrad)"
                dot={{ r: 3, fill: C.journal, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Journal mood clusters ── */}
      <div className="card">
        <SectionHeader
          title="Recurring Health Themes"
          sub="AI-detected topic clusters from your journal entries"
        />
        <ClusterCloud clusters={journalTrends?.detected_clusters} />
        {journalTrends?.trend_summary && journalTrends.total_entries > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed var(--line)" }}>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)", margin: "0 0 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Latest Summary Snippet
            </p>
            <p style={{ fontSize: "var(--text-sm)", color: "#3f4c48", lineHeight: "var(--lh-normal)", margin: 0 }}>
              {journalTrends.trend_summary.slice(0, 320)}{journalTrends.trend_summary.length > 320 ? "…" : ""}
            </p>
            <button
              className="btn-ghost"
              style={{ marginTop: 10, padding: "5px 11px", fontSize: "var(--text-xs)" }}
              onClick={() => navigate("/journal")}
            >
              View full trend analysis →
            </button>
          </div>
        )}
      </div>

      {/* ── Medication timeline ── */}
      <div className="card">
        <SectionHeader
          title="Medication Timeline"
          sub="When each medication was added to your list"
        />
        <MedTimeline medications={medications} />
      </div>
    </div>
  );
}
