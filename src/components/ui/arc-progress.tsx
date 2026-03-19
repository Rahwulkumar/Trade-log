/**
 * Circular arc SVG progress indicator.
 * Used on the dashboard to show prop-firm profit target progress.
 */
export function ArcProgress({ percent }: { percent: number }) {
  const c = Math.min(Math.max(percent, 0), 100);
  const r = 42,
    circ = 2 * Math.PI * r,
    dash = (c / 100) * circ;
  return (
    <svg width="110" height="110" viewBox="0 0 100 100" aria-hidden>
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--border-default)"
        strokeWidth="7"
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--accent-primary)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        transform="rotate(-90 50 50)"
        style={{
          transition: "stroke-dasharray 600ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />
      <text
        x="50"
        y="46"
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize="14"
        fontWeight="600"
        fontFamily="var(--font-jb-mono)"
      >
        {c.toFixed(0)}%
      </text>
      <text
        x="50"
        y="60"
        textAnchor="middle"
        fill="var(--text-tertiary)"
        fontSize="8"
        fontFamily="var(--font-inter)"
      >
        To Target
      </text>
    </svg>
  );
}
