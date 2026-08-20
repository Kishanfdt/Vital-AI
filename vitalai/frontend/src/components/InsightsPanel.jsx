import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { SkeletonLines } from "./Spinner";
import { useToast } from "./Toast";
import { TrendingUp, Pill, BookOpen, Activity, Sparkles, RefreshCw, Tag, ShieldCheck } from "lucide-react";
import { formatClinicalTimestamp } from "../utils/formatters";

const API_URL = import.meta.env.VITE_API_URL;

/* ── Restrained Clinical Palette for Recharts ────────────────── */
const C = {
  self_care:             "#2e6b4f", /* Green */
  see_doctor_soon:       "#b8823a", /* Amber */
  seek_emergency_care:   "#a5432a", /* Red */
  journal:               "#0f3d3a", /* Deep Teal */
  area_journal:          "#1d5450",
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

function buildUrgencyChartData(records) {
  const map = {};
  records.forEach(r => {
    const d = dateKey(r.created_at);
    if (!map[d]) map[d] = { date: d, self_care: 0, see_doctor_soon: 0, seek_emergency_care: 0 };
    if (r.urgency in map[d]) map[d][r.urgency]++;
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

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
      borderRadius: 6, padding: "8px 12px",
      boxShadow: "var(--shadow-md)", fontSize: 12,
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
      borderRadius: "var(--radius-card)", padding: "16px 18px",
      boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 6,
        background: "var(--paper)", border: "1px solid var(--line)",
        display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, color,
      }}>
        <Icon size={16} strokeWidth={1.8} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--font-body)", lineHeight: 1, color: "var(--ink)", marginBottom: 4 }}>
          {value ?? "—"}
        </div>
        <div className="card-section-label" style={{ margin: 0 }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────── */
function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <span className="card-section-label" style={{ marginBottom: 2 }}>{title}</span>
      {sub && <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>{sub}</p>}
    </div>
  );
}

/* ── Empty chart placeholder ─────────────────────────────── */
function ChartEmpty({ message }) {
  return (
    <div style={{
      height: 180, display: "flex", alignItems: "center", justifyContent: "center",
      border: "1px dashed var(--line)", borderRadius: "var(--radius-sm)",
      color: "var(--muted)", fontSize: 12, textAlign: "center", padding: 24,
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
        <div key={med.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: 12, position: "relative" }}>
          {i < sorted.length - 1 && (
            <div style={{ position: "absolute", left: 6, top: 18, bottom: 0, width: 2, background: "var(--line)" }} />
          )}
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--paper)", border: "2px solid var(--deep-teal)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{med.name}</span>
            {med.dosage && <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>{med.dosage}</span>}
            <div className="timestamp-text" style={{ marginTop: 2 }}>
              Added {new Date(med.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
    return <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>No clusters detected yet — at least 3 journal entries with embeddings are needed.</p>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {clusters.map((c, i) => (
        <span key={i} style={{
          background: "var(--paper)", border: "1px solid var(--line)",
          borderRadius: 4, padding: "3px 10px",
          fontSize: 12, fontWeight: 600, color: "var(--deep-teal)",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          <Tag size={11} /> {c}
        </span>
      ))}
    </div>
  );
}

/* ── Proactive AI Agent Section ─────────────────────────── */
function ProactiveAgentSection({ token }) {
  const toast = useToast();
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState("");

  const fetchInsights = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const url = isRefresh
        ? `${API_URL}/agent/insights/refresh`
        : `${API_URL}/agent/insights`;
      const method = isRefresh ? "POST" : "GET";
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch agent insights");
      const json = await res.json();
      setData(json);
      if (isRefresh) {
        toast("Agent insights refreshed!", "success");
      }
    } catch (e) {
      setError("Unable to load proactive agent insights right now.");
      if (isRefresh) toast("Failed to refresh agent insights.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [token]);

  const getTypeBadge = (type) => {
    const config = {
      pattern:     { label: "PATTERN DETECTED", class: "status-good" },
      trend:       { label: "WELLNESS TREND", class: "status-good" },
      correlation: { label: "CORRELATION", class: "status-warning" },
      note:        { label: "OBSERVATION", class: "status-good" },
      no_pattern:  { label: "BASELINE", class: "status-good" },
    };
    return config[type] || config.note;
  };

  return (
    <div className="card card-triage-accent accent-teal" style={{ marginBottom: 24 }}>
      {/* Card Header with Permanent AI Attribution Chip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span className="card-section-label" style={{ margin: 0, color: "var(--ink)" }}>Clinical Insights Engine</span>
            <span className="ai-disclaimer-chip">
              <Sparkles size={11} /> AI-Generated Observation
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
            Multi-tool longitudinal evaluation across triage checks, journal logs &amp; active medications.
          </p>
        </div>

        <button
          className="btn-ghost"
          onClick={() => fetchInsights(true)}
          disabled={loading || refreshing}
          style={{ fontSize: 11, padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          {refreshing ? "Evaluating..." : "Refresh Insights"}
        </button>
      </div>

      {loading ? (
        <SkeletonLines lines={4} />
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : (
        <>
          {/* Metadata bar */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "8px 12px", background: "var(--paper)", borderRadius: "var(--radius-xs)", marginBottom: 16, border: "1px solid var(--line)", fontSize: 11 }}>
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>DATA WINDOW:</span>
            <span style={{ color: "var(--muted)" }}>{data?.data_summary || "60-day patient window"}</span>
            <div style={{ flexGrow: 1 }} />
            {data?.tools_called?.length > 0 && (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ color: "var(--muted)", marginRight: 2 }}>Tools used:</span>
                {data.tools_called.map((tool) => (
                  <span key={tool} style={{ background: "#fff", border: "1px solid var(--line)", padding: "1px 6px", borderRadius: 3, fontSize: 10, fontWeight: 600, color: "var(--deep-teal)" }}>
                    {tool.replace("get_", "").replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Insights Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {data?.insights?.map((item, idx) => {
              const tb = getTypeBadge(item.type);
              return (
                <div
                  key={idx}
                  style={{
                    background: "#fff",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-sm)",
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                      <span className={`status-badge ${tb.class}`} style={{ fontSize: 10 }}>
                        {tb.label}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>
                        {item.confidence} Confidence
                      </span>
                    </div>

                    <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: "0 0 4px 0", lineHeight: 1.3 }}>
                      {item.headline}
                    </h4>

                    <p style={{ fontSize: 12, color: "#384643", margin: "0 0 10px 0", lineHeight: 1.45 }}>
                      {item.detail}
                    </p>
                  </div>

                  {item.sources?.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 8, borderTop: "1px dashed var(--line)", marginTop: "auto" }}>
                      <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>SOURCES:</span>
                      {item.sources.map((src) => (
                        <span key={src} style={{ background: "var(--paper)", border: "1px solid var(--line)", padding: "1px 5px", borderRadius: 3, fontSize: 10, color: "var(--muted)" }}>
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
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

  const urgencyChartData  = useMemo(() => buildUrgencyChartData(triageHistory), [triageHistory]);
  const journalChartData  = useMemo(() => buildJournalChartData(journalEntries), [journalEntries]);
  const journalThisMonth  = useMemo(() => currentMonthCount(journalEntries), [journalEntries]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="card">
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
      <div style={{ marginBottom: 20 }}>
        <span className="section-label">EHR Analytics</span>
        <h1>Insights &amp; Longitudinal Trends</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Quantitative visualization of symptom triage frequency, journal activity, and care patterns.
        </p>
      </div>

      {/* ── Proactive AI Health Agent Section ── */}
      <ProactiveAgentSection token={token} />

      {/* ── Summary stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard
          icon={Activity}
          label="Triage Checks"
          value={triageHistory.length}
          sub="Last 90 days"
          color="var(--deep-teal)"
        />
        <StatCard
          icon={Pill}
          label="Current Meds"
          value={medications.length}
          sub="Active list"
          color="var(--warning)"
        />
        <StatCard
          icon={BookOpen}
          label="Journal Logs"
          value={journalThisMonth}
          sub="This month"
          color="var(--success)"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Logs"
          value={journalEntries.length}
          sub="All time"
          color="var(--deep-teal)"
        />
      </div>

      {/* ── Triage urgency chart ── */}
      <div className="card">
        <SectionHeader
          title="Symptom Triage Frequency"
          sub="Distribution of urgency levels over time"
        />
        {urgencyChartData.length === 0 ? (
          <ChartEmpty message="No triage checks recorded yet — perform a symptom check to populate chart." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={urgencyChartData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
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
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                formatter={v => URGENCY_LABEL[v] ?? v}
              />
              <Bar dataKey="self_care"           stackId="u" fill={C.self_care}           radius={[0,0,0,0]} />
              <Bar dataKey="see_doctor_soon"     stackId="u" fill={C.see_doctor_soon}     radius={[0,0,0,0]} />
              <Bar dataKey="seek_emergency_care" stackId="u" fill={C.seek_emergency_care} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Journal entries per day ── */}
      <div className="card">
        <SectionHeader
          title="Journal Volume &amp; Frequency"
          sub="Number of entries recorded per day"
        />
        {journalChartData.length === 0 ? (
          <ChartEmpty message="No journal entries logged yet — record your first entry in Health Journal." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={journalChartData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="journalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.journal} stopOpacity={0.12} />
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
                  <div style={{ background:"#fff", border:"1px solid var(--line)", borderRadius:6, padding:"6px 10px", boxShadow:"var(--shadow-md)", fontSize:11 }}>
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

      {/* ── Journal symptom clusters ── */}
      <div className="card">
        <SectionHeader
          title="Recurring Health Themes"
          sub="Identified symptom clusters from journal embeddings"
        />
        <ClusterCloud clusters={journalTrends?.detected_clusters} />
      </div>

      {/* ── Medication timeline ── */}
      <div className="card">
        <SectionHeader
          title="Medication Index Timeline"
          sub="Chronological log of active prescription additions"
        />
        <MedTimeline medications={medications} />
      </div>
    </div>
  );
}
