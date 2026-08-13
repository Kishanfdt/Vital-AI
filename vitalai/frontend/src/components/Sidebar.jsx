import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Activity,
  MessageCircle,
  Pill,
  FileText,
  BookOpen,
  LogOut,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const NAV_ITEMS = [
  { to: "/",            Icon: LayoutGrid,    label: "Overview"       },
  { to: "/triage",      Icon: Activity,      label: "Symptom Check"  },
  { to: "/chat",        Icon: MessageCircle, label: "Coach Chat"     },
  { to: "/medications", Icon: Pill,          label: "Medications"    },
  { to: "/documents",   Icon: FileText,      label: "Documents Q&A"  },
  { to: "/journal",     Icon: BookOpen,      label: "Health Journal" },
];

function NavList({ onNavigate, userEmail }) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    if (onNavigate) onNavigate();
    navigate("/");
  }

  return (
    <>
      <NavLink to="/" className="sidebar-brand" onClick={onNavigate} aria-label="VitalAI home">
        <span className="sidebar-brand-mark" aria-hidden="true" />
        <span className="sidebar-brand-name">VitalAI</span>
      </NavLink>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={onNavigate}
          >
            <span className="nav-icon" aria-hidden="true">
              <Icon size={16} strokeWidth={2} />
            </span>
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
          <LogOut size={13} strokeWidth={2} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </>
  );
}

export default function Sidebar({ userEmail, mobileOpen, onMobileClose }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar" aria-label="Sidebar navigation">
        <NavList userEmail={userEmail} />
      </aside>

      {/* Mobile overlay */}
      <div
        className="mobile-overlay"
        style={{
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: "opacity 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <aside
        className={`mobile-drawer${mobileOpen ? " open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
      >
        <NavList userEmail={userEmail} onNavigate={onMobileClose} />
      </aside>
    </>
  );
}
