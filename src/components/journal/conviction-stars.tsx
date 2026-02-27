"use client";

const LABELS: Record<number, string> = {
  1: "Weak",
  2: "Low",
  3: "Moderate",
  4: "Strong",
  5: "Max",
};

interface ConvictionStarsProps {
  value: number | null;
  onChange: (v: number | null) => void;
}

export function ConvictionStars({ value, onChange }: ConvictionStarsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = value != null && star <= value;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(value === star ? null : star)}
              title={LABELS[star]}
              className="transition-transform duration-100 hover:scale-125"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                style={{
                  fill: filled ? "var(--accent-primary)" : "transparent",
                  stroke: filled
                    ? "var(--accent-primary)"
                    : "var(--border-active)",
                  strokeWidth: 1.5,
                  filter: filled
                    ? "drop-shadow(0 0 4px var(--accent-primary))"
                    : "none",
                  transition: "fill 0.15s, stroke 0.15s, filter 0.15s",
                }}
              >
                <polygon points="10,2 18,10 10,18 2,10" />
              </svg>
            </button>
          );
        })}
      </div>
      {value != null && (
        <span
          className="font-bold uppercase tracking-widest"
          style={{ fontSize: "0.62rem", color: "var(--accent-primary)" }}
        >
          {LABELS[value]}
        </span>
      )}
    </div>
  );
}
