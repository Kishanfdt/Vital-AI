/**
 * Clinical Timestamp & Date Helper Utilities
 */

/**
 * Returns a clean relative time string (e.g. "2 hours ago", "Just now", "3 days ago")
 * or a formatted date if older than a week.
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return `${mins}m ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Returns a precise clinical timestamp string (e.g. "Aug 20, 2026 · 14:32")
 */
export function formatClinicalTimestamp(dateInput) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${datePart} · ${timePart}`;
}

/**
 * Generates a deterministic mock MRN / Patient Chart ID based on user email
 */
export function getPatientChartId(email) {
  if (!email) return "MRN-90214";
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash) % 89999 + 10000;
  return `MRN-${positive}`;
}
