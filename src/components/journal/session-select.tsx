"use client";

import { ChevronDown } from "lucide-react";

type Session = "Asian" | "London" | "Overlap" | "New York" | "Pre-market";

interface SessionSelectProps {
  value: string | null;
  onChange: (v: string | null) => void;
}

const SESSIONS: { id: Session; color: string; bg: string }[] = [
  { id: "Asian",      color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  { id: "London",     color: "var(--accent-primary)", bg: "var(--accent-soft)" },
  { id: "Overlap",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  { id: "New York",   color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  { id: "Pre-market", color: "var(--text-tertiary)", bg: "var(--surface-elevated)" },
];

export function SessionSelect({ value, onChange }: SessionSelectProps) {
  const session = SESSIONS.find((s) => s.id === value);

  return (
    <div className="relative inline-flex">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="appearance-none rounded-full text-[11px] font-medium pl-2.5 pr-6 py-0.5 focus:outline-none transition-all duration-150 cursor-pointer"
        style={{
          background: session ? session.bg : "var(--surface-elevated)",
          color: session ? session.color : "var(--text-tertiary)",
          border: `1px solid ${session ? session.color : "var(--border-default)"}`,
        }}
      >
        <option value="">Session</option>
        {SESSIONS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.id}
          </option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
        style={{ color: session ? session.color : "var(--text-tertiary)" }}
        strokeWidth={2}
      />
    </div>
  );
}
