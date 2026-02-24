"use client";

type Rating = "Good" | "Neutral" | "Poor";

interface QualityRatingProps {
  label: string;
  value: Rating | null;
  onChange: (v: Rating | null) => void;
}

const OPTIONS: {
  key: Rating;
  activeColor: string;
  activeBg: string;
}[] = [
  {
    key: "Good",
    activeColor: "var(--profit-primary)",
    activeBg: "var(--profit-bg)",
  },
  {
    key: "Neutral",
    activeColor: "var(--text-secondary)",
    activeBg: "var(--surface-elevated)",
  },
  {
    key: "Poor",
    activeColor: "var(--loss-primary)",
    activeBg: "var(--loss-bg)",
  },
];

export function QualityRating({ label, value, onChange }: QualityRatingProps) {
  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-[9px] uppercase tracking-[0.2em] font-bold"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
      <div
        className="flex overflow-hidden"
        style={{
          borderRadius: "var(--radius-default)",
          border: "1px solid var(--border-default)",
        }}
      >
        {OPTIONS.map(({ key, activeColor, activeBg }, i) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(active ? null : key)}
              className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-150"
              style={{
                background: active ? activeBg : "transparent",
                color: active ? activeColor : "var(--text-tertiary)",
                borderRight:
                  i < 2 ? "1px solid var(--border-default)" : undefined,
              }}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
