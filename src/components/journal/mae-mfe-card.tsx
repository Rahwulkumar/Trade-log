"use client";

interface MaeMfeCardProps {
  mae: number | null;
  mfe: number | null;
  rMultiple: number | null;
  onMaeChange: (v: number | null) => void;
  onMfeChange: (v: number | null) => void;
}

function BarRow({
  label,
  value,
  rMultiple,
  color,
  prefix,
  onChange,
}: {
  label: string;
  value: number | null;
  rMultiple: number | null;
  color: string;
  prefix: string;
  onChange: (v: number | null) => void;
}) {
  const pct =
    value != null && rMultiple != null && rMultiple !== 0
      ? Math.min(100, (Math.abs(value) / Math.abs(rMultiple)) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{ color: "var(--text-tertiary)" }}
        >
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            {prefix}
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={value ?? ""}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : parseFloat(e.target.value))
            }
            placeholder="0.00"
            className="w-16 text-right text-[11px] font-mono rounded px-1.5 py-0.5 focus:outline-none"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
          />
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            R
          </span>
        </div>
      </div>

      {/* Bar track */}
      <div
        className="relative h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--surface-elevated)" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
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
  // Efficiency: how much of the MFE was captured as actual profit
  const efficiency =
    mfe != null && rMultiple != null && mfe > 0
      ? Math.min(100, Math.round((Math.abs(rMultiple) / mfe) * 100))
      : null;

  return (
    <div className="surface p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-semibold"
          style={{ color: "var(--text-tertiary)" }}
        >
          Execution Quality
        </span>
        <div className="h-px flex-1" style={{ background: "var(--border-default)" }} />
      </div>

      {/* MAE */}
      <BarRow
        label="MAE (Max Against)"
        value={mae}
        rMultiple={rMultiple}
        color="var(--loss-primary)"
        prefix="−"
        onChange={onMaeChange}
      />

      {/* MFE */}
      <BarRow
        label="MFE (Max Favorable)"
        value={mfe}
        rMultiple={rMultiple}
        color="var(--profit-primary)"
        prefix="+"
        onChange={onMfeChange}
      />

      {/* Efficiency */}
      {efficiency !== null && (
        <div
          className="flex items-center justify-between rounded-[var(--radius-default)] px-3 py-2"
          style={{ background: "var(--surface-elevated)" }}
        >
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Profit captured
          </span>
          <span
            className="text-[13px] font-semibold font-mono"
            style={{
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
