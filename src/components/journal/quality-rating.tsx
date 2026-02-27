"use client";

type Rating = "Good" | "Neutral" | "Poor";

interface QualityRatingProps {
  label: string;
  value: Rating | null;
  onChange: (v: Rating | null) => void;
}

const OPTIONS: { key: Rating; color: string; bg: string; border: string }[] = [
  {
    key: "Good",
    color: "var(--profit-primary)",
    bg: "var(--profit-bg)",
    border: "var(--profit-primary)",
  },
  {
    key: "Neutral",
    color: "var(--text-secondary)",
    bg: "var(--surface-active)",
    border: "var(--border-default)",
  },
  {
    key: "Poor",
    color: "var(--loss-primary)",
    bg: "var(--loss-bg)",
    border: "var(--loss-primary)",
  },
];

export function QualityRating({ label, value, onChange }: QualityRatingProps) {
  return (
    <div className="flex flex-col gap-2">
      <span
        style={{
          fontSize: "0.6rem",
          color: "var(--text-tertiary)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
        }}
      >
        {label}
      </span>
      <div
        className="flex overflow-hidden rounded-[8px]"
        style={{ border: "1px solid var(--border-subtle)" }}
      >
        {OPTIONS.map(({ key, color, bg, border }, i) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(active ? null : key)}
              className="flex-1 py-2.5 font-bold uppercase transition-all duration-150"
              style={{
                fontSize: "0.68rem",
                letterSpacing: "0.08em",
                background: active ? bg : "var(--surface-elevated)",
                color: active ? color : "var(--text-tertiary)",
                borderRight:
                  i < 2 ? "1px solid var(--border-subtle)" : undefined,
                boxShadow: active ? `inset 0 -2px 0 ${border}` : "none",
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
