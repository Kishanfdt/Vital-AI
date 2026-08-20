import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { supabase } from "./supabaseClient";
import { getPatientChartId } from "./utils/formatters";

import { ToastProvider } from "./components/Toast";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import Overview from "./components/Overview";
import InsightsPanel from "./components/InsightsPanel";
import AppointmentsPanel from "./components/AppointmentsPanel";
import TriagePanel from "./components/TriagePanel";
import ChatPanel from "./components/ChatPanel";
import MedicationsPanel from "./components/MedicationsPanel";
import DocumentsPanel from "./components/DocumentsPanel";
import JournalPanel from "./components/JournalPanel";
import CareCirclePanel from "./components/CareCirclePanel";

/* ── Persistent Patient Context Header ─────────────────────── */
function PatientContextHeader({ userEmail }) {
  const rawName = userEmail?.split("@")[0] || "Patient";
  const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const initial = rawName.charAt(0).toUpperCase();
  const mrn = getPatientChartId(userEmail);

  return (
    <header className="patient-context-header" aria-label="Patient context banner">
      <div className="patient-info">
        <div className="patient-avatar" aria-hidden="true">{initial}</div>
        <div className="patient-meta">
          <span className="patient-name">{formattedName}</span>
          <span className="patient-mrn">{mrn} · Active Health Record</span>
        </div>
      </div>
      <div className="patient-status-strip">
        <span className="status-dot" aria-hidden="true" />
        <span>Last check-in: 2 days ago · No active emergency alerts</span>
      </div>
    </header>
  );
}

/* ── Animated route container (re-mounts on pathname change) ── */
function AnimatedRoutes({ token, userEmail }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-content" style={{ display: "contents" }}>
      <Routes location={location}>
        <Route path="/"             element={<Overview          userEmail={userEmail} token={token} />} />
        <Route path="/insights"     element={<InsightsPanel     token={token} />} />
        <Route path="/appointments" element={<AppointmentsPanel token={token} />} />
        <Route path="/care-circle"  element={<CareCirclePanel   token={token} userEmail={userEmail} />} />
        <Route path="/triage"       element={<TriagePanel       token={token} />} />
        <Route path="/chat"         element={<ChatPanel         token={token} />} />
        <Route path="/medications"  element={<MedicationsPanel  token={token} />} />
        <Route path="/documents"    element={<DocumentsPanel    token={token} />} />
        <Route path="/journal"      element={<JournalPanel      token={token} />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

/* ── Auth gate ─────────────────────────────────────────────── */
function AuthenticatedApp({ session }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const token     = session.access_token;
  const userEmail = session.user.email;

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <Sidebar
        userEmail={userEmail}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div className="mobile-topbar-brand">
          <span
            style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#3ea877", display: "inline-block", marginRight: 8,
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontSize: 17, fontWeight: 600, color: "white",
            }}
          >
            VitalAI
          </span>
        </div>
        <button
          className="hamburger"
          onClick={() => setMobileOpen((p) => !p)}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Main content with persistent patient header */}
      <main className="main-content" id="main-content">
        <PatientContextHeader userEmail={userEmail} />
        <div className="main-content-inner">
          <AnimatedRoutes token={token} userEmail={userEmail} />
        </div>
      </main>
    </div>
  );
}

/* ── Root ──────────────────────────────────────────────────── */
export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;

  return (
    <BrowserRouter>
      <ToastProvider>
        {session ? (
          <AuthenticatedApp session={session} />
        ) : (
          <Routes>
            <Route path="*" element={<Login />} />
          </Routes>
        )}
      </ToastProvider>
    </BrowserRouter>
  );
}
