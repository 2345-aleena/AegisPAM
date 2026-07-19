/**
 * The app's one recurring visual signature: a wax-seal motif standing in
 * for "sealed" (secret hidden / session inactive) vs "broken" (secret
 * revealed / session active) states -- a more fitting metaphor for a vault
 * than a generic padlock icon, and reused consistently across the Secrets,
 * Sessions, and Access Request views so its meaning builds over the app.
 */
export default function Seal({ state = "sealed", size = 28, className = "" }) {
  const isOpen = state === "open";
  const isPending = state === "pending";

  const ringColor = isPending ? "var(--color-warning)" : isOpen ? "var(--color-olive-700)" : "var(--color-brown-600)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="17" stroke={ringColor} strokeWidth="2" fill={isOpen ? "var(--color-olive-100)" : "var(--color-cream-soft)"} />
      {/* Ridges around the seal, like a pressed wax stamp */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x1 = 20 + Math.cos(angle) * 14.5;
        const y1 = 20 + Math.sin(angle) * 14.5;
        const x2 = 20 + Math.cos(angle) * 17;
        const y2 = 20 + Math.sin(angle) * 17;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ringColor} strokeWidth="1.5" opacity="0.55" />;
      })}
      {isOpen ? (
        // broken seal: two offset arcs implying the stamp has been cracked open
        <>
          <path d="M12 24 L18 16 L22 20 L28 12" stroke={ringColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      ) : isPending ? (
        <circle cx="20" cy="20" r="4.5" fill={ringColor} opacity="0.8" />
      ) : (
        // sealed: intact monogram mark
        <path d="M14 24 L20 13 L26 24 M16.5 19.5 H23.5" stroke={ringColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}
    </svg>
  );
}
