"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface FieldGroupProps {
  label?: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

interface ControlSurfaceProps {
  children: ReactNode;
  className?: string;
}

interface ChoiceChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  children: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
  activeColor?: string;
  activeBackground?: string;
  activeBorderColor?: string;
  inactiveColor?: string;
}

interface ChecklistRowProps {
  text: string;
  checked: boolean;
  onToggle: () => void;
}

interface ValueBarProps {
  value: number;
  color?: string;
}

export function ControlSurface({
  children,
  className,
}: ControlSurfaceProps) {
  return (
    <div
      className={cn("rounded-[var(--radius-lg)] border p-4", className)}
      style={{
        background: "var(--surface-elevated)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {children}
    </div>
  );
}

export function FieldGroup({
  label,
  meta,
  children,
  className,
}: FieldGroupProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {label || meta ? (
        <div className="flex items-center justify-between gap-3">
          {label ? <p className="text-label">{label}</p> : <span />}
          {meta ? <div className="shrink-0">{meta}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function ChoiceChip({
  active,
  children,
  icon,
  compact = false,
  className,
  activeColor = "var(--accent-primary)",
  activeBackground = "var(--accent-soft)",
  activeBorderColor = "var(--accent-primary)",
  inactiveColor = "var(--text-secondary)",
  ...props
}: ChoiceChipProps) {
  const ariaPressed = props["aria-pressed"] ?? active;

  return (
    <button
      type="button"
      aria-pressed={ariaPressed}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border font-medium transition-colors",
        compact ? "min-w-8 px-2.5 py-1.5 text-[0.7rem]" : "px-3 py-2 text-[0.75rem]",
        className,
      )}
      style={{
        background: active ? activeBackground : "var(--surface)",
        color: active ? activeColor : inactiveColor,
        borderColor: active ? activeBorderColor : "var(--border-subtle)",
      }}
      {...props}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
}

export function ChecklistRow({
  text,
  checked,
  onToggle,
}: ChecklistRowProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className="flex w-full items-start gap-2.5 rounded-[var(--radius-default)] px-1 py-1.5 text-left transition-opacity"
      style={{ opacity: checked ? 0.58 : 1 }}
    >
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded"
        style={{
          border: checked ? "none" : "1.5px solid var(--border-subtle)",
          background: checked ? "var(--accent-primary)" : "transparent",
        }}
      >
        {checked ? (
          <Check
            className="h-2.5 w-2.5"
            style={{ color: "var(--text-inverse)" }}
            strokeWidth={3}
          />
        ) : null}
      </span>
      <span
        className="text-[0.8125rem] leading-snug"
        style={{
          color: "var(--text-primary)",
          textDecoration: checked ? "line-through" : "none",
        }}
      >
        {text}
      </span>
    </button>
  );
}

export function ValueBar({
  value,
  color = "var(--accent-primary)",
}: ValueBarProps) {
  return (
    <div
      className="h-1.5 w-full rounded-full"
      style={{ background: "var(--border-subtle)" }}
    >
      <div
        className="h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  );
}

export function AppTextArea({
  className,
  ...props
}: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      className={cn(
        "resize-none rounded-[var(--radius-md)] px-3 py-2.5 text-[0.8125rem] leading-relaxed",
        className,
      )}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-primary)",
      }}
      {...props}
    />
  );
}
