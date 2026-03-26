"use client";

import { cn } from "@/lib/utils";

interface BrandMarkProps {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 32, className }: BrandMarkProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-[9px]",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #0D5C3A 0%, #1A8C6A 100%)",
        boxShadow:
          "0 0 12px rgba(44,194,153,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="2.5"
          y="13"
          width="2.5"
          height="4"
          rx="0.7"
          fill="rgba(218,241,222,0.5)"
        />
        <rect
          x="6.5"
          y="10"
          width="2.5"
          height="7"
          rx="0.7"
          fill="rgba(218,241,222,0.7)"
        />
        <rect x="10.5" y="6" width="2.5" height="11" rx="0.7" fill="#DAF1DE" />
        <rect
          x="14.5"
          y="9"
          width="2.5"
          height="8"
          rx="0.7"
          fill="rgba(218,241,222,0.55)"
        />
        <polyline
          points="11.75,5.5 11.75,2.5 14.5,5"
          stroke="#2CC299"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
