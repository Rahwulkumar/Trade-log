"use client";

import { Star } from "lucide-react";

interface ConvictionStarsProps {
  value: number | null;
  onChange: (v: number | null) => void;
}

export function ConvictionStars({ value, onChange }: ConvictionStarsProps) {
  const handleClick = (star: number) => {
    // Click same star = deselect (set null)
    onChange(value === star ? null : star);
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          className="p-0.5 transition-transform duration-100 hover:scale-110"
          title={`${star} star${star > 1 ? "s" : ""}`}
        >
          <Star
            className="w-4 h-4 transition-colors duration-150"
            style={{
              color:
                value != null && star <= value
                  ? "var(--accent-primary)"
                  : "var(--text-tertiary)",
              fill:
                value != null && star <= value
                  ? "var(--accent-primary)"
                  : "transparent",
            }}
            strokeWidth={1.8}
          />
        </button>
      ))}
      {value != null && (
        <span
          className="ml-1 text-[10px] font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          {value}/5
        </span>
      )}
    </div>
  );
}
