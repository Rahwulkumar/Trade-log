"use client";

import { Check, Minus, X } from "lucide-react";

type Rating = "Good" | "Neutral" | "Poor";

interface QualityRatingProps {
  label: string;
  value: Rating | null;
  onChange: (v: Rating | null) => void;
}

const OPTIONS: { key: Rating; icon: typeof Check; activeColor: string; activeBg: string }[] = [
  { key: "Good",    icon: Check, activeColor: "var(--profit-primary)", activeBg: "var(--profit-bg)" },
  { key: "Neutral", icon: Minus, activeColor: "var(--text-secondary)", activeBg: "var(--surface-elevated)" },
  { key: "Poor",    icon: X,     activeColor: "var(--loss-primary)",   activeBg: "var(--loss-bg)" },
];

export function QualityRating({ label, value, onChange }: QualityRatingProps) {
  const handleClick = (key: Rating) => {
    // Click same = deselect
    onChange(value === key ? null : key);
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <div className="flex items-center gap-1">
        {OPTIONS.map(({ key, icon: Icon, activeColor, activeBg }) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleClick(key)}
              className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] font-medium transition-all duration-150"
              style={{
                background: active ? activeBg : "transparent",
                color: active ? activeColor : "var(--text-tertiary)",
                border: `1px solid ${active ? activeColor : "var(--border-default)"}`,
              }}
            >
              <Icon className="w-3 h-3" strokeWidth={2} />
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
