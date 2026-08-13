import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Login from "./components/Login";
import TriagePanel from "./components/TriagePanel";
import ChatPanel from "./components/ChatPanel";
import MedicationsPanel from "./components/MedicationsPanel";
import DocumentsPanel from "./components/DocumentsPanel";

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [tab, setTab] = useState("triage");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (checkingSession) return null;

  if (!session) return <Login />;

  const token = session.access_token;

  return (
    <div className="shell">
      <div className="top-bar">
        <div className="brand" style={{ marginBottom: 0 }}>
          <span className="brand-mark" />
          <span className="brand-name">VitalAI</span>
        </div>
        <div>
          <span className="user-email">{session.user.email}</span>{" "}
          <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "triage" ? "active" : ""}`} onClick={() => setTab("triage")}>
          Symptom check
        </button>
        <button className={`tab ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")}>
          Coach chat
        </button>
        <button className={`tab ${tab === "medications" ? "active" : ""}`} onClick={() => setTab("medications")}>
          Medications
        </button>
        <button className={`tab ${tab === "documents" ? "active" : ""}`} onClick={() => setTab("documents")}>
          Documents Q&A
        </button>
      </div>

      {tab === "triage" && <TriagePanel token={token} />}
      {tab === "chat" && <ChatPanel token={token} />}
      {tab === "medications" && <MedicationsPanel token={token} />}
      {tab === "documents" && <DocumentsPanel token={token} />}
    </div>
  );
}
