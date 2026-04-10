"use client";

import type { ReactNode } from "react";

import { AppTextArea } from "@/components/ui/control-primitives";

export function JournalWritingDeck({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[20px] border ${className}`.trim()}
      style={{
        background: "color-mix(in srgb, var(--surface-elevated) 72%, var(--surface))",
        borderColor: "var(--border-subtle)",
      }}
    >
      {children}
    </div>
  );
}

export function JournalWritingCell({
  step,
  title,
  hint,
  children,
  className = "",
}: {
  step: string;
  title: string;
  hint: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-3 px-4 py-4 sm:px-5 ${className}`.trim()}>
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          {step}
        </span>
        <div className="space-y-1">
          <p
            style={{
              color: "var(--text-primary)",
              fontFamily:
                "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              fontSize: "14px",
              fontWeight: 700,
              lineHeight: 1.25,
            }}
          >
            {title}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function JournalWritingArea({
  value,
  onChange,
  rows,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  rows: number;
  placeholder: string;
  className?: string;
}) {
  return (
    <AppTextArea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={`rounded-[14px] border px-3.5 py-3 text-[0.93rem] ${className}`.trim()}
      style={{
        background: "color-mix(in srgb, var(--surface) 92%, transparent)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-primary)",
        lineHeight: 1.65,
      }}
    />
  );
}

export function JournalMetaStrip({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 text-[11px]"
      style={{ color: "var(--text-tertiary)" }}
    >
      {children}
    </div>
  );
}
