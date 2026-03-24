"use client";

import { type ReactNode, useCallback, useId, useState } from "react";
import { Circle, Star } from "lucide-react";

import type { QualityRating } from "@/domain/journal-types";
import { ChoiceChip, AppTextArea } from "@/components/ui/control-primitives";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/page-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";

const QUALITY_VALUES: readonly QualityRating[] = [1, 2, 3, 4, 5];

type JournalChoiceTone = "neutral" | "profit" | "loss" | "warning" | "accent";

function choiceToneStyles(tone: JournalChoiceTone) {
  if (tone === "accent") {
    return {
      activeColor: "var(--accent-primary)",
      activeBackground: "var(--accent-soft)",
      activeBorderColor: "var(--accent-primary)",
    };
  }

  if (tone === "profit") {
    return {
      activeColor: "var(--profit-primary)",
      activeBackground: "var(--profit-bg)",
      activeBorderColor: "var(--profit-primary)",
    };
  }

  if (tone === "loss") {
    return {
      activeColor: "var(--loss-primary)",
      activeBackground: "var(--loss-bg)",
      activeBorderColor: "var(--loss-primary)",
    };
  }

  if (tone === "warning") {
    return {
      activeColor: "var(--warning-primary)",
      activeBackground: "var(--warning-bg)",
      activeBorderColor: "var(--warning-primary)",
    };
  }

  return {
    activeColor: "var(--text-primary)",
    activeBackground: "var(--surface-elevated)",
    activeBorderColor: "var(--border-active)",
  };
}

export function JournalSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <InsetPanel className="space-y-5" paddingClassName="px-5 py-5 sm:px-6">
      <SectionHeader
        className="mb-0"
        title={title}
        subtitle={subtitle}
      />
      {children}
    </InsetPanel>
  );
}

export function JournalChoiceChip({
  active,
  onClick,
  children,
  tone = "neutral",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: JournalChoiceTone;
}) {
  const toneStyles = choiceToneStyles(tone);

  return (
    <ChoiceChip
      active={active}
      onClick={onClick}
      activeColor={toneStyles.activeColor}
      activeBackground={toneStyles.activeBackground}
      activeBorderColor={toneStyles.activeBorderColor}
    >
      {children}
    </ChoiceChip>
  );
}

export function JournalPromptField({
  prompt,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder: string;
}) {
  const fieldId = useId();

  return (
    <div className="space-y-2">
      <label
        htmlFor={fieldId}
        style={{
          color: "var(--text-secondary)",
          fontFamily: "var(--font-inter)",
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        {prompt}
      </label>
      <AppTextArea
        id={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="px-4 py-3 text-[0.875rem]"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-primary)",
          lineHeight: 1.7,
        }}
      />
    </div>
  );
}

export function JournalShortField({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  mono?: boolean;
}) {
  const fieldId = useId();

  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="text-label">
        {label}
      </label>
      <Input
        id={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 text-[0.8125rem]"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-primary)",
          fontFamily: mono ? "var(--font-jb-mono)" : "var(--font-inter)",
        }}
      />
    </div>
  );
}

export function JournalMetaDatum({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <InsetPanel className="space-y-1" paddingClassName="px-4 py-3">
      <p className="text-label">{label}</p>
      <p
        style={{
          color: "var(--text-primary)",
          fontFamily: "var(--font-jb-mono)",
          fontSize: "13px",
          lineHeight: 1.4,
        }}
      >
        {value}
      </p>
    </InsetPanel>
  );
}

export function JournalRatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: QualityRating | null;
  onChange: (value: QualityRating | null) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-label">{label}</legend>
      <div className="flex items-center gap-1.5">
        {QUALITY_VALUES.map((step) => {
          const active = (value ?? 0) >= step;
          return (
            <button
              key={step}
              type="button"
              onClick={() => onChange(value === step ? null : step)}
              className="transition-colors"
              aria-label={`${label} rating ${step}`}
              aria-pressed={active}
              style={{
                color: active
                  ? "var(--accent-primary)"
                  : "var(--border-default)",
              }}
            >
              <Star
                size={16}
                fill={active ? "currentColor" : "none"}
                strokeWidth={1.7}
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function JournalConvictionInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-label">Conviction</legend>
      <div className="flex items-center gap-2">
        {QUALITY_VALUES.map((step) => {
          const active = (value ?? 0) >= step;
          return (
            <button
              key={step}
              type="button"
              onClick={() => onChange(value === step ? null : step)}
              className="transition-colors"
              aria-label={`Conviction ${step}`}
              aria-pressed={active}
              style={{
                color: active
                  ? "var(--accent-primary)"
                  : "var(--border-default)",
              }}
            >
              <Circle
                size={16}
                fill={active ? "currentColor" : "none"}
                strokeWidth={1.8}
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function JournalTagField({
  label,
  tags,
  onChange,
  tone,
  placeholder,
}: {
  label: string;
  tags: string[];
  onChange: (next: string[]) => void;
  tone: "neutral" | "loss";
  placeholder: string;
}) {
  const fieldId = useId();
  const [draft, setDraft] = useState("");

  const commit = useCallback(() => {
    const next = draft.trim();
    if (!next) {
      return;
    }
    if (tags.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...tags, next]);
    setDraft("");
  }, [draft, onChange, tags]);

  return (
    <fieldset className="space-y-2">
      <legend className="text-label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <ChoiceChip
            key={tag}
            active
            onClick={() => onChange(tags.filter((item) => item !== tag))}
            activeColor={
              tone === "loss"
                ? "var(--loss-primary)"
                : "var(--text-secondary)"
            }
            activeBackground={
              tone === "loss" ? "var(--loss-bg)" : "transparent"
            }
            activeBorderColor={
              tone === "loss"
                ? "var(--loss-primary)"
                : "var(--border-default)"
            }
            className="rounded-full"
          >
            {tag}
          </ChoiceChip>
        ))}
        <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            id={fieldId}
            aria-label={label}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          className="h-8 min-w-[11rem] rounded-full text-[0.75rem]"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary)",
            }}
          />
        </div>
    </fieldset>
  );
}
