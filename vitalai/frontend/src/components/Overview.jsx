import { useNavigate } from "react-router-dom";

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

export default function Overview({ userEmail }) {
  const navigate = useNavigate();
  const firstName = userEmail?.split("@")[0] ?? "there";

  return (
    <div>
      <div className="overview-greeting">
        <h1>{getGreeting()}, {firstName} 👋</h1>
        <p>
          Welcome to VitalAI — your AI-powered health &amp; wellness platform.
          Select a tool below to get started.
        </p>
      </div>

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
