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
  size?: "sm" | "md";
}

export function ConvictionStars({ value, onChange, size = "md" }: ConvictionStarsProps) {
  const starSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = value != null && star <= value;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(value === star ? null : star)}
              className="transition-transform duration-100 hover:scale-125 p-0.5"
              title={LABELS[star]}
            >
              {/* Diamond shape using SVG for a more unique look */}
              <svg
                className={starSize}
                viewBox="0 0 20 20"
                style={{
                  fill: filled ? "var(--accent-primary)" : "transparent",
                  stroke: filled ? "var(--accent-primary)" : "var(--border-active)",
                  strokeWidth: 1.5,
                  transition: "fill 0.15s ease, stroke 0.15s ease",
                  filter: filled ? "drop-shadow(0 0 3px var(--accent-glow))" : "none",
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
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{
                        color: "var(--accent-primary)",
          }}
        >
          {LABELS[value]}
        </span>
      )}
    </div>
  );
}
