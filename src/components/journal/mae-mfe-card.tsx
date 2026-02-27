"use client";

interface MaeMfeCardProps {
  mae: number | null;
  mfe: number | null;
  rMultiple: number | null;
  onMaeChange: (v: number | null) => void;
  onMfeChange: (v: number | null) => void;
  compact?: boolean;
}

function RInput({
  value,
  onChange,
  color,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  color: string;
}) {
  return (
    <input
      type="number"
      step="0.01"
      min="0"
      value={value ?? ""}
      onChange={(e) =>
        onChange(e.target.value === "" ? null : parseFloat(e.target.value))
      }
      placeholder="0.00"
      className="w-16 text-right focus:outline-none bg-transparent font-mono font-bold"
      style={{
        fontSize: "0.88rem",
        color,
        borderBottom: "1px solid var(--border-default)",
      }}
      onFocus={(e) =>
        (e.target.style.borderBottomColor = "var(--accent-primary)")
      }
      onBlur={(e) =>
        (e.target.style.borderBottomColor = "var(--border-default)")
      }
    />
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      className="h-2 w-full rounded-full overflow-hidden"
      style={{ background: "var(--surface-elevated)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          background: color,
          boxShadow: pct > 0 ? `0 0 6px ${color}66` : "none",
        }}
      />
    </div>
  );
}

export function MaeMfeCard({
  mae,
  mfe,
  rMultiple,
  onMaeChange,
  onMfeChange,
}: MaeMfeCardProps) {
  const maxR = Math.max(
    Math.abs(mae ?? 0),
    Math.abs(mfe ?? 0),
    Math.abs(rMultiple ?? 0),
    0.01,
  );
  const maePct = mae != null ? Math.min(100, (Math.abs(mae) / maxR) * 100) : 0;
  const mfePct = mfe != null ? Math.min(100, (Math.abs(mfe) / maxR) * 100) : 0;
  const rrPct =
    rMultiple != null ? Math.min(100, (Math.abs(rMultiple) / maxR) * 100) : 0;
  const efficiency =
    mfe != null && rMultiple != null && mfe > 0
      ? Math.min(100, Math.round((Math.abs(rMultiple) / mfe) * 100))
      : null;

  const rows = [
    {
      label: "MAE",
      sublabel: "Max Adverse Excursion",
      value: mae,
      pct: maePct,
      color: "var(--loss-primary)",
      onChange: onMaeChange,
      sign: "−",
    },
    {
      label: "MFE",
      sublabel: "Max Favorable Excursion",
      value: mfe,
      pct: mfePct,
      color: "var(--profit-primary)",
      onChange: onMfeChange,
      sign: "+",
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {rows.map(({ label, sublabel, value, pct, color, onChange, sign }) => (
        <div key={label} className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span
                className="font-bold"
                style={{ fontSize: "0.75rem", color: "var(--text-primary)" }}
              >
                {label}
              </span>
              <span
                className="ml-2"
                style={{ fontSize: "0.62rem", color: "var(--text-tertiary)" }}
              >
                {sublabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}
              >
                {sign}
              </span>
              <RInput value={value} onChange={onChange} color={color} />
              <span
                style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}
              >
                R
              </span>
            </div>
          </div>
          <Bar pct={pct} color={color} />
        </div>
      ))}

      {/* R displayed */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span
            className="font-bold"
            style={{ fontSize: "0.75rem", color: "var(--text-primary)" }}
          >
            P&amp;L
          </span>
          <span
            className="font-mono font-bold"
            style={{ fontSize: "0.88rem", color: "var(--accent-primary)" }}
          >
            {rMultiple != null
              ? `${rMultiple >= 0 ? "+" : ""}${rMultiple.toFixed(2)}R`
              : "—"}
          </span>
        </div>
        <Bar pct={rrPct} color="var(--accent-primary)" />
      </div>

      {/* Efficiency */}
      {efficiency !== null && (
        <div
          className="flex items-center justify-between rounded-[8px] px-3 py-2.5"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <span
              className="font-semibold"
              style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}
            >
              Profit Captured
            </span>
            <p style={{ fontSize: "0.62rem", color: "var(--text-tertiary)" }}>
              % of max favorable move realized
            </p>
          </div>
          <span
            className="font-black tabular-nums"
            style={{
              fontSize: "1.4rem",
              color:
                efficiency >= 70
                  ? "var(--profit-primary)"
                  : efficiency >= 40
                    ? "var(--text-secondary)"
                    : "var(--loss-primary)",
            }}
          >
            {efficiency}%
          </span>
        </div>
      )}
    </div>
  );
}
