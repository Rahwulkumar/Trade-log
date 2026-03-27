"use client";

import { type ReactNode, useCallback, useId, useState } from "react";
import { Circle, Star } from "lucide-react";

import type { QualityRating } from "@/domain/journal-types";
import {
  ChoiceChip,
  AppTextArea,
} from "@/components/ui/control-primitives";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/page-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";
import { cn } from "@/lib/utils";

const QUALITY_VALUES: readonly QualityRating[] = [1, 2, 3, 4, 5];

type JournalChoiceTone = "neutral" | "profit" | "loss" | "warning" | "accent";
export type JournalTabState = "empty" | "progress" | "complete";
type JournalSectionVariant = "editorial" | "structured" | "tool";

export interface JournalTabItem {
  id: string;
  label: string;
  progressLabel: string;
  state: JournalTabState;
}

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

function tabStateStyles(state: JournalTabState) {
  if (state === "complete") {
    return {
      dotColor: "var(--profit-primary)",
      metaColor: "var(--profit-primary)",
    };
  }

  if (state === "progress") {
    return {
      dotColor: "var(--warning-primary)",
      metaColor: "var(--warning-primary)",
    };
  }

  return {
    dotColor: "var(--border-default)",
    metaColor: "var(--text-tertiary)",
  };
}

export function JournalSection({
  title,
  subtitle,
  children,
  variant = "structured",
  className,
  contentClassName,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  variant?: JournalSectionVariant;
  className?: string;
  contentClassName?: string;
}) {
  if (variant === "editorial") {
    return (
      <section
        className={cn("space-y-6 pb-8", className)}
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <SectionHeader
          className="mb-0"
          title={title}
          subtitle={subtitle}
        />
        <div className={cn("space-y-5", contentClassName)}>{children}</div>
      </section>
    );
  }

  const panelPadding =
    variant === "tool" ? "px-4 py-4 sm:px-5" : "px-5 py-5 sm:px-6";

  return (
    <InsetPanel
      className={cn(variant === "tool" ? "space-y-4" : "space-y-5", className)}
      paddingClassName={panelPadding}
    >
      <SectionHeader
        className="mb-0"
        title={title}
        subtitle={subtitle}
      />
      <div className={cn(variant === "tool" ? "space-y-4" : "space-y-5", contentClassName)}>
        {children}
      </div>
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

export function JournalTabRail({
  items,
  activeTab,
  onChange,
  ariaLabel = "Journal sections",
}: {
  items: JournalTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      className="overflow-x-auto"
      style={{ scrollbarWidth: "thin" }}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex min-w-max gap-2 pb-1"
      >
        {items.map((item) => {
          const active = item.id === activeTab;
          const styles = tabStateStyles(item.state);

          return (
            <button
              key={item.id}
              id={`${item.id}-tab`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${item.id}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(item.id)}
              className="min-w-[8.5rem] shrink-0 rounded-t-[var(--radius-sm)] border-b-2 px-2.5 pb-3 pt-1 text-left transition-colors sm:min-w-[9.5rem]"
              style={{
                background: "transparent",
                borderBottomColor: active
                  ? "var(--accent-primary)"
                  : "transparent",
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: styles.dotColor }}
                />
                <span
                  className="truncate"
                  style={{
                    color: active
                      ? "var(--accent-primary)"
                      : "var(--text-primary)",
                    fontFamily: "var(--font-inter)",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  {item.label}
                </span>
              </div>
              <p
                style={{
                  color: styles.metaColor,
                  fontFamily: "var(--font-jb-mono)",
                  fontSize: "11px",
                  lineHeight: 1.35,
                  marginTop: "8px",
                  paddingLeft: "18px",
                }}
              >
                {item.progressLabel}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function JournalTabPanel({
  id,
  active,
  children,
  className,
}: {
  id: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      id={`${id}-panel`}
      role="tabpanel"
      aria-labelledby={`${id}-tab`}
      hidden={!active}
      className={cn("space-y-8", className)}
    >
      {children}
    </div>
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
    <div className="space-y-2.5">
      <label
        htmlFor={fieldId}
        style={{
          color: "var(--text-secondary)",
          fontFamily: "var(--font-inter)",
          fontSize: "13.5px",
          lineHeight: 1.65,
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
        className="px-5 py-4 text-[0.9375rem]"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-primary)",
          lineHeight: 1.8,
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
