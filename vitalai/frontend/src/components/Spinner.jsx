export function Spinner({ size = "md", centered = false }) {
  const cls = `spinner ${size === "sm" ? "spinner-sm" : ""}`;
  if (centered) {
    return (
      <div className="spinner-center">
        <span className={cls} role="status" aria-label="Loading" />
      </div>
    );
  }
  return <span className={cls} role="status" aria-label="Loading" />;
}

export function SkeletonLines({ lines = 3 }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton skeleton-line" />
      ))}
    </div>
  );
}
