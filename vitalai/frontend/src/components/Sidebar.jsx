import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  BarChart2,
  CalendarDays,
  Activity,
  MessageCircle,
  Pill,
  FileText,
  BookOpen,
  Users,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const NAV_ITEMS = [
  { to: "/",             Icon: LayoutGrid,    label: "Overview"       },
  { to: "/insights",     Icon: BarChart2,     label: "Insights"       },
  { to: "/appointments", Icon: CalendarDays,  label: "Appointments"   },
  { to: "/care-circle",  Icon: Users,         label: "Care Circle"    },
  { to: "/triage",       Icon: Activity,      label: "Symptom Check"  },
  { to: "/chat",         Icon: MessageCircle, label: "Coach Chat"     },
  { to: "/medications",  Icon: Pill,          label: "Medications"    },
  { to: "/documents",    Icon: FileText,      label: "Documents Q&A"  },
  { to: "/journal",      Icon: BookOpen,      label: "Health Journal" },
];

function NavList({ onNavigate, userEmail }) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem("vitalai_theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vitalai_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, width: "100%" }}>
          <span className="sidebar-user-email" title={userEmail} style={{ margin: 0 }}>{userEmail}</span>
          <button
            onClick={toggleTheme}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: 4,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            aria-label="Toggle dark mode"
          >
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>

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
