"use client";

interface MaeMfeCardProps {
  mae: number | null;
  mfe: number | null;
  rMultiple: number | null;
  onMaeChange: (v: number | null) => void;
  onMfeChange: (v: number | null) => void;
  /** compact = used inline in the stats strip */
  compact?: boolean;
}

function EditableR({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
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
      placeholder="—"
      className="w-14 text-right focus:outline-none bg-transparent text-[13px] font-bold"
      style={{
        fontFamily: "var(--font-jb-mono)",
        color: "var(--text-primary)",
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

export function MaeMfeCard({
  mae,
  mfe,
  rMultiple,
  onMaeChange,
  onMfeChange,
  compact = false,
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

  if (compact) {
    return (
      <div className="flex flex-col gap-3 w-full">
        {/* Three bars side by side */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "MAE",
              value: mae,
              pct: maePct,
              color: "var(--loss-primary)",
              onChange: onMaeChange,
              prefix: "−",
            },
            {
              label: "MFE",
              value: mfe,
              pct: mfePct,
              color: "var(--profit-primary)",
              onChange: onMfeChange,
              prefix: "+",
            },
            {
              label: "P&L",
              value: rMultiple,
              pct: rrPct,
              color: "var(--accent-primary)",
              onChange: null,
              prefix: "",
            },
          ].map(({ label, value, pct, color, onChange: oc, prefix }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span
                  className="text-[8px] uppercase tracking-[0.2em] font-bold"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {label}
                </span>
                {oc ? (
                  <EditableR value={value} onChange={oc} />
                ) : (
                  <span
                    className="text-[13px] font-bold"
                    style={{ fontFamily: "var(--font-jb-mono)", color }}
                  >
                    {value != null
                      ? `${prefix}${Math.abs(value).toFixed(2)}R`
                      : "—"}
                  </span>
                )}
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "var(--surface-elevated)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: color, opacity: 0.85 }}
                />
              </div>
            </div>
          ))}
        </div>

        {efficiency !== null && (
          <div className="flex items-center justify-between">
            <span
              className="text-[9px] uppercase tracking-[0.2em] font-bold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Efficiency
            </span>
            <span
              className="text-[14px] font-black"
              style={{
                fontFamily: "var(--font-jb-mono)",
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

  // Full card mode (used in standalone section)
  return (
    <div className="flex flex-col gap-4">
      <span
        className="text-[9px] uppercase tracking-[0.2em] font-bold"
        style={{ color: "var(--text-tertiary)" }}
      >
        MAE / MFE
      </span>
      {[
        {
          label: "Max Against (MAE)",
          value: mae,
          pct: maePct,
          color: "var(--loss-primary)",
          onChange: onMaeChange,
          sign: "−",
        },
        {
          label: "Max Favorable (MFE)",
          value: mfe,
          pct: mfePct,
          color: "var(--profit-primary)",
          onChange: onMfeChange,
          sign: "+",
        },
      ].map(({ label, value, pct, color, onChange: oc, sign }) => (
        <div key={label} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span
              className="text-[10px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {label}
            </span>
            <div className="flex items-center gap-1">
              <span
                className="text-[10px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {sign}
              </span>
              <EditableR value={value} onChange={oc} />
              <span
                className="text-[10px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                R
              </span>
            </div>
          </div>
          <div
            className="h-2.5 rounded-full overflow-hidden"
            style={{ background: "var(--surface-elevated)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
        </div>
      ))}
      {efficiency !== null && (
        <div
          className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-default)]"
          style={{ background: "var(--surface-elevated)" }}
        >
          <span
            className="text-[10px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Profit Captured
          </span>
          <span
            className="text-[16px] font-black"
            style={{
              fontFamily: "var(--font-jb-mono)",
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
