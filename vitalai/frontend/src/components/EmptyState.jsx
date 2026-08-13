/* SVG line-art empty-state illustrations for VitalAI
   Stroke-based, uses --deep-teal and --clay from the palette.
   No fills, no photos, no stock clip-art. */

const TEAL = "#0f3d3a";
const CLAY = "#c76f4f";
const SAGE = "#7fa896";

export function EmptyMedications() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      {/* Pill capsule */}
      <rect x="12" y="30" width="48" height="16" rx="8" stroke={TEAL} strokeWidth="2" />
      <line x1="36" y1="30" x2="36" y2="46" stroke={TEAL} strokeWidth="2" />
      <circle cx="24" cy="38" r="2.5" fill={CLAY} />
      <circle cx="48" cy="38" r="2.5" fill={CLAY} />
      {/* Small cross (medical) */}
      <line x1="36" y1="10" x2="36" y2="22" stroke={TEAL} strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="16" x2="42" y2="16" stroke={TEAL} strokeWidth="2" strokeLinecap="round" />
      {/* Bottom detail lines */}
      <line x1="20" y1="56" x2="52" y2="56" stroke={SAGE} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" />
      <line x1="26" y1="62" x2="46" y2="62" stroke={SAGE} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" />
    </svg>
  );
}

export function EmptyDocuments() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      {/* Document */}
      <rect x="16" y="10" width="32" height="42" rx="3" stroke={TEAL} strokeWidth="2" />
      {/* Folded corner */}
      <path d="M38 10 L48 20 L38 20 Z" stroke={TEAL} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Text lines */}
      <line x1="22" y1="28" x2="40" y2="28" stroke={SAGE} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="34" x2="40" y2="34" stroke={SAGE} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="40" x2="33" y2="40" stroke={SAGE} strokeWidth="1.5" strokeLinecap="round" />
      {/* Magnifying glass */}
      <circle cx="51" cy="55" r="8" stroke={CLAY} strokeWidth="2" />
      <line x1="57" y1="61" x2="63" y2="67" stroke={CLAY} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="47" y1="52" x2="55" y2="52" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
    </svg>
  );
}

export function EmptyJournal() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      {/* Open book */}
      <path d="M12 16 C12 16 12 56 12 56 L36 52 L60 56 C60 56 60 16 60 16 L36 20 Z"
        stroke={TEAL} strokeWidth="2" strokeLinejoin="round" />
      {/* Spine */}
      <line x1="36" y1="20" x2="36" y2="52" stroke={TEAL} strokeWidth="1.5" />
      {/* Left page lines */}
      <line x1="17" y1="26" x2="33" y2="25" stroke={SAGE} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="17" y1="32" x2="33" y2="31" stroke={SAGE} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="17" y1="38" x2="30" y2="37" stroke={SAGE} strokeWidth="1.2" strokeLinecap="round" />
      {/* Right page — pen mark */}
      <path d="M42 30 L52 24 L56 28 L46 34 Z" stroke={CLAY} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="52" y1="24" x2="54" y2="22" stroke={CLAY} strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="30" x2="42" y2="38" stroke={CLAY} strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  );
}

export function EmptyChat() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      {/* Assistant bubble */}
      <rect x="8" y="10" width="38" height="24" rx="10" stroke={TEAL} strokeWidth="2" />
      <path d="M14 34 L10 42 L20 34" stroke={TEAL} strokeWidth="2" strokeLinejoin="round" />
      {/* Lines inside */}
      <line x1="16" y1="20" x2="38" y2="20" stroke={SAGE} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="27" x2="32" y2="27" stroke={SAGE} strokeWidth="1.5" strokeLinecap="round" />
      {/* User bubble */}
      <rect x="26" y="42" width="38" height="20" rx="8" stroke={CLAY} strokeWidth="2" />
      <path d="M58 62 L62 68 L52 62" stroke={CLAY} strokeWidth="2" strokeLinejoin="round" />
      <line x1="33" y1="51" x2="57" y2="51" stroke={CLAY} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6" />
    </svg>
  );
}

/* Generic empty state wrapper — takes an illustration component + message */
export function EmptyState({ illustration: Illustration, message, children }) {
  return (
    <div className="empty-state">
      <Illustration />
      <p>{message}</p>
      {children}
    </div>
  );
}
