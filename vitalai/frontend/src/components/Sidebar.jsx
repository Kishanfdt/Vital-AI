import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const NAV_ITEMS = [
  { to: "/",            icon: "⊞",  label: "Overview"       },
  { to: "/triage",      icon: "🩺", label: "Symptom Check"  },
  { to: "/chat",        icon: "💬", label: "Coach Chat"     },
  { to: "/medications", icon: "💊", label: "Medications"    },
  { to: "/documents",   icon: "📄", label: "Documents Q&A"  },
  { to: "/journal",     icon: "📓", label: "Health Journal" },
];

function NavList({ onNavigate, userEmail }) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <>
      <NavLink to="/" className="sidebar-brand" onClick={onNavigate}>
        <span className="sidebar-brand-mark" aria-hidden="true" />
        <span className="sidebar-brand-name">VitalAI</span>
      </NavLink>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <span className="nav-icon" aria-hidden="true">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-user-email" title={userEmail}>{userEmail}</span>
        <button
          className="sidebar-signout"
          onClick={handleSignOut}
          aria-label="Sign out of VitalAI"
        >
          <span aria-hidden="true">↪</span> Sign out
        </button>
      </div>
    </>
  );
}

export default function Sidebar({ userEmail, mobileOpen, onMobileClose }) {
  return (
    <>
      {/* Desktop sidebar — always visible ≥769px */}
      <aside className="sidebar" aria-label="Sidebar">
        <NavList userEmail={userEmail} />
      </aside>

      {/* Mobile drawer + overlay */}
      <div
        className="mobile-overlay"
        style={{ opacity: mobileOpen ? 1 : 0, pointerEvents: mobileOpen ? "auto" : "none" }}
        onClick={onMobileClose}
        aria-hidden="true"
      />
      <aside
        className={`mobile-drawer ${mobileOpen ? "open" : ""}`}
        aria-label="Mobile navigation"
      >
        <NavList userEmail={userEmail} onNavigate={onMobileClose} />
      </aside>
    </>
  );
}
