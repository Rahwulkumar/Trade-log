/**
 * Horizontal progress bar showing drawdown usage with a traffic-light color zone.
 * Green zone: 0–50%, amber zone: 50–80%, red zone: 80–100%.
 */
export function DrawdownGauge({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number;
}) {
  const pct = Math.min((used / max) * 100, 100);
  const color =
    pct < 50
      ? "var(--profit-primary)"
      : pct < 80
        ? "var(--warning-primary)"
        : "var(--loss-primary)";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-label">{label}</span>
        <span className="mono" style={{ fontSize: "0.73rem", color }}>
          -{used.toFixed(1)}%
          <span style={{ color: "var(--text-tertiary)" }}> / {max}%</span>
        </span>
      </div>
      <div
        className="relative h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--border-default)" }}
      >
        <div className="absolute inset-0 flex">
          <div
            className="h-full"
            style={{ width: "50%", background: "rgba(78,203,6,0.15)" }}
          />
          <div
            className="h-full"
            style={{ width: "30%", background: "rgba(240,165,0,0.12)" }}
          />
          <div
            className="h-full flex-1"
            style={{ background: "rgba(224,82,90,0.12)" }}
          />
        </div>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            transition: "width 600ms cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
    </div>
  );
}
