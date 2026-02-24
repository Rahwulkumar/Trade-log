"use client";

type Session = "Asian" | "London" | "Overlap" | "New York" | "Pre-market";

interface SessionSelectProps {
  value: string | null;
  onChange: (v: string | null) => void;
  /** standalone = show all pills as a selector row */
  standalone?: boolean;
}

const SESSIONS: { id: Session; color: string; bg: string; border: string }[] = [
  { id: "Asian",      color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.4)" },
  { id: "London",     color: "var(--accent-primary)", bg: "var(--accent-soft)", border: "var(--accent-primary)" },
  { id: "Overlap",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.4)" },
  { id: "New York",   color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.4)" },
  { id: "Pre-market", color: "var(--text-secondary)", bg: "var(--surface-elevated)", border: "var(--border-default)" },
];

export function SessionSelect({ value, onChange, standalone = false }: SessionSelectProps) {
  const active = SESSIONS.find((s) => s.id === value);

  if (standalone) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {SESSIONS.map((s) => {
          const on = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(on ? null : s.id)}
              className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-semibold px-3 py-1.5 transition-all duration-150"
              style={{
                background: on ? s.bg : "transparent",
                color: on ? s.color : "var(--text-tertiary)",
                border: `1px solid ${on ? s.border : "var(--border-default)"}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: on ? s.color : "var(--text-tertiary)", opacity: on ? 1 : 0.35 }}
              />
              {s.id}
            </button>
          );
        })}
      </div>
    );
  }

  /* Compact inline badge-select for HeroCard */
  return (
    <div className="relative inline-flex items-center">
      {active && (
        <span
          className="pointer-events-none absolute left-2 w-1.5 h-1.5 rounded-full"
          style={{ background: active.color }}
        />
      )}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="appearance-none rounded-full text-[11px] font-semibold py-1 focus:outline-none transition-all duration-150 cursor-pointer"
        style={{
          paddingLeft: active ? "1.5rem" : "0.625rem",
          paddingRight: "1.25rem",
          background: active ? active.bg : "var(--surface-elevated)",
          color: active ? active.color : "var(--text-tertiary)",
          border: `1px solid ${active ? active.border : "var(--border-default)"}`,
        }}
      >
        <option value="">Session</option>
        {SESSIONS.map((s) => (
          <option key={s.id} value={s.id}>{s.id}</option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-1.5"
        width="10" height="10" viewBox="0 0 10 10"
        style={{ color: active ? active.color : "var(--text-tertiary)" }}
      >
        <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}
