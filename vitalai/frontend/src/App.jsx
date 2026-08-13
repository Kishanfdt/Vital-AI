import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { supabase } from "./supabaseClient";

import { ToastProvider } from "./components/Toast";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import Overview from "./components/Overview";
import TriagePanel from "./components/TriagePanel";
import ChatPanel from "./components/ChatPanel";
import MedicationsPanel from "./components/MedicationsPanel";
import DocumentsPanel from "./components/DocumentsPanel";
import JournalPanel from "./components/JournalPanel";

/* ── Auth gate ─────────────────────────────────────────────── */
function AuthenticatedApp({ session }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const token = session.access_token;
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
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#c76f4f",
              display: "inline-block",
              marginRight: 8,
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontSize: 18,
              fontWeight: 600,
              color: "white",
            }}
          >
            VitalAI
          </span>
        </div>
        <button
          className="hamburger"
          onClick={() => setMobileOpen((p) => !p)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Main content */}
      <main className="main-content" id="main-content">
        <div className="main-content-inner">
          <Routes>
            <Route path="/" element={<Overview userEmail={userEmail} />} />
            <Route path="/triage" element={<TriagePanel token={token} />} />
            <Route path="/chat" element={<ChatPanel token={token} />} />
            <Route path="/medications" element={<MedicationsPanel token={token} />} />
            <Route path="/documents" element={<DocumentsPanel token={token} />} />
            <Route path="/journal" element={<JournalPanel token={token} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

/* ── Root ──────────────────────────────────────────────────── */
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Still loading
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
