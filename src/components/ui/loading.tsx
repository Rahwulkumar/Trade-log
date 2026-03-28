import type { CSSProperties, ReactNode } from "react";

import { AppPanel } from "@/components/ui/page-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";
import { cn } from "@/lib/utils";

type LoadingTone = "default" | "accent" | "profit" | "warning";

function loadingGradient(tone: LoadingTone) {
  if (tone === "accent") {
    return "linear-gradient(90deg, color-mix(in srgb, var(--accent-soft) 92%, var(--surface-elevated)) 0%, color-mix(in srgb, var(--accent-muted) 72%, var(--surface-hover)) 50%, color-mix(in srgb, var(--accent-soft) 92%, var(--surface-elevated)) 100%)";
  }

  if (tone === "profit") {
    return "linear-gradient(90deg, color-mix(in srgb, var(--profit-bg) 88%, var(--surface-elevated)) 0%, color-mix(in srgb, var(--profit-primary) 12%, var(--surface-hover)) 50%, color-mix(in srgb, var(--profit-bg) 88%, var(--surface-elevated)) 100%)";
  }

  if (tone === "warning") {
    return "linear-gradient(90deg, color-mix(in srgb, var(--warning-bg) 86%, var(--surface-elevated)) 0%, color-mix(in srgb, var(--warning-primary) 12%, var(--surface-hover)) 50%, color-mix(in srgb, var(--warning-bg) 86%, var(--surface-elevated)) 100%)";
  }

  return "linear-gradient(90deg, var(--surface-elevated) 0%, var(--surface-hover) 50%, var(--surface-elevated) 100%)";
}

export function LoadingBlock({
  className,
  tone = "default",
  style,
}: {
  className?: string;
  tone?: LoadingTone;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("shimmer rounded-[var(--radius-md)]", className)}
      style={{
        backgroundImage: loadingGradient(tone),
        ...style,
      }}
    />
  );
}

export function PulseLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="glow-pulse h-2.5 w-2.5 rounded-full"
          style={{
            background: "var(--accent-primary)",
            animationDelay: `${index * 120}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function BarLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-8 items-end gap-1.5", className)}>
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className="rounded-full"
          style={{
            width: "5px",
            height: `${14 + index * 4}px`,
            background:
              index % 2 === 0 ? "var(--accent-primary)" : "var(--accent-secondary)",
            animation: `glow-pulse 1.8s ease-in-out ${index * 90}ms infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function LoadingSignal({
  title = "Loading workspace",
  description = "Preparing your data and layout.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]"
        style={{
          background: "var(--accent-soft)",
          border: "1px solid var(--accent-muted)",
        }}
      >
        <BarLoader className="h-5" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </p>
      </div>
    </div>
  );
}

export function LoadingHeroPanel({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <AppPanel className={cn("overflow-hidden px-6", compact ? "py-5" : "py-6", className)}>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <LoadingBlock className="h-3 w-24 rounded-full" tone="accent" />
          <LoadingBlock className="h-9 w-64 max-w-full" />
          <LoadingBlock className="h-4 w-[32rem] max-w-full" />
        </div>
        <div className="flex items-center gap-3">
          <LoadingSignal
            title="Building view"
            description="Syncing page scaffolds."
          />
        </div>
      </div>
    </AppPanel>
  );
}

export function LoadingMetricCard({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: LoadingTone;
}) {
  return (
    <article
      className={cn(
        "flex h-full flex-col justify-between rounded-[var(--radius-lg)] border px-4 py-4",
        className,
      )}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="space-y-3">
        <LoadingBlock className="h-3 w-20" tone={tone === "default" ? "accent" : tone} />
        <LoadingBlock className="h-8 w-28" tone={tone} />
        <LoadingBlock className="h-3 w-40 max-w-full" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <LoadingBlock className="h-5 w-16 rounded-full" tone={tone} />
        <LoadingBlock className="h-3 w-20" />
      </div>
    </article>
  );
}

export function LoadingMetricGrid({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const tones: LoadingTone[] = ["accent", "default", "profit", "warning"];

  return (
    <section
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <LoadingMetricCard
          key={index}
          tone={tones[index % tones.length]}
        />
      ))}
    </section>
  );
}

export function LoadingPanel({
  className,
  chart = false,
  rows = 3,
  children,
}: {
  className?: string;
  chart?: boolean;
  rows?: number;
  children?: ReactNode;
}) {
  return (
    <AppPanel className={cn("space-y-4 p-5", className)}>
      <div className="space-y-2.5">
        <LoadingBlock className="h-4 w-36" tone="accent" />
        <LoadingBlock className="h-3 w-64 max-w-full" />
      </div>

      {children ? (
        children
      ) : chart ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingBlock
                key={index}
                className="h-8 rounded-full"
                tone={index === 0 ? "accent" : "default"}
              />
            ))}
          </div>
          <LoadingBlock className="h-[260px] w-full rounded-[var(--radius-xl)]" />
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <LoadingBlock
              key={index}
              className={cn(
                "h-14 w-full rounded-[var(--radius-lg)]",
                index === rows - 1 && "w-4/5",
              )}
            />
          ))}
        </div>
      )}
    </AppPanel>
  );
}

export function LoadingListRows({
  count = 5,
  className,
  compact = false,
}: {
  count?: number;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <InsetPanel
          key={index}
          className="space-y-3"
          paddingClassName={compact ? "px-3 py-3" : "px-4 py-4"}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2.5">
              <LoadingBlock className="h-4 w-40 max-w-full" />
              <LoadingBlock className="h-3 w-64 max-w-full" />
            </div>
            <LoadingBlock className="h-8 w-16 rounded-full" tone="accent" />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <LoadingBlock className="h-12 rounded-[var(--radius-md)]" />
            <LoadingBlock className="h-12 rounded-[var(--radius-md)]" />
            <LoadingBlock className="h-12 rounded-[var(--radius-md)]" />
          </div>
        </InsetPanel>
      ))}
    </div>
  );
}

export function LoadingRail({
  className,
  rows = 6,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <AppPanel className={cn("flex min-h-0 flex-col p-4", className)}>
      <LoadingBlock className="mb-4 h-10 w-full rounded-[var(--radius-md)]" tone="accent" />
      <InsetPanel className="mb-4 space-y-3" paddingClassName="p-3">
        <LoadingBlock className="h-3 w-24" />
        <LoadingBlock className="h-10 w-full rounded-[var(--radius-md)]" />
      </InsetPanel>
      <LoadingBlock className="mb-3 h-3 w-20" />
      <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
        {Array.from({ length: rows }).map((_, index) => (
          <LoadingBlock
            key={index}
            className="h-16 rounded-[var(--radius-md)]"
            tone={index === 0 ? "accent" : "default"}
          />
        ))}
      </div>
    </AppPanel>
  );
}

export function LoadingCalendarGrid({ className }: { className?: string }) {
  return (
    <AppPanel className={cn("space-y-5 p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LoadingBlock className="h-10 w-48 rounded-[var(--radius-md)]" />
        <div className="flex items-center gap-2">
          <LoadingBlock className="h-10 w-10 rounded-[var(--radius-md)]" />
          <LoadingBlock className="h-10 w-36 rounded-[var(--radius-md)]" tone="accent" />
          <LoadingBlock className="h-10 w-10 rounded-[var(--radius-md)]" />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <LoadingBlock key={index} className="h-8 rounded-[var(--radius-md)]" />
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[var(--radius-lg)] border p-2"
            style={{
              background: "var(--surface-elevated)",
              borderColor: "var(--border-subtle)",
              minHeight: "96px",
            }}
          >
            <LoadingBlock className="h-6 w-8 rounded-full" tone={index % 9 === 0 ? "accent" : "default"} />
            <LoadingBlock className="mt-4 h-11 w-full rounded-[var(--radius-md)]" />
          </div>
        ))}
      </div>
    </AppPanel>
  );
}

export function LoadingJournalWorkspace({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[calc(100dvh-64px)] min-h-0 flex-col gap-3 overflow-hidden px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-6",
        className,
      )}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border px-4 py-3"
        style={{
          background: "color-mix(in srgb, var(--surface) 92%, transparent)",
          borderColor: "var(--border-subtle)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <LoadingBlock className="h-4 w-20" tone="accent" />
          <LoadingBlock className="h-7 w-32 rounded-full" />
          <LoadingBlock className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <LoadingBlock className="h-9 w-32 rounded-[var(--radius-md)]" />
          <LoadingBlock className="h-8 w-20 rounded-full" tone="accent" />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <LoadingRail className="hidden lg:flex" rows={7} />

        <AppPanel className="min-h-0 overflow-hidden p-0">
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <LoadingBlock className="h-3 w-16 rounded-full" tone="accent" />
                <LoadingBlock className="h-8 w-44 max-w-full" />
                <LoadingBlock className="h-4 w-72 max-w-full" />
              </div>
              <div className="flex items-center gap-2">
                <LoadingBlock className="h-9 w-28 rounded-[var(--radius-md)]" />
                <LoadingBlock className="h-9 w-28 rounded-[var(--radius-md)]" />
              </div>
            </div>

            <LoadingBlock className="h-12 w-full rounded-[var(--radius-lg)]" tone="accent" />
            <LoadingPanel chart rows={0} />
            <div className="space-y-3">
              <LoadingBlock className="h-4 w-28" />
              <LoadingBlock className="h-[40dvh] min-h-[260px] w-full rounded-[var(--radius-xl)]" />
            </div>
          </div>
        </AppPanel>
      </div>
    </div>
  );
}

export function LoadingCenteredPanel({
  title = "Loading",
  description = "Preparing the next view.",
  className,
  minHeight = 220,
}: {
  title?: string;
  description?: string;
  className?: string;
  minHeight?: number;
}) {
  return (
    <AppPanel className={cn("flex items-center justify-center", className)}>
      <div
        className="flex max-w-sm flex-col items-center justify-center text-center"
        style={{ minHeight }}
      >
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{
            background: "var(--accent-soft)",
            border: "1px solid var(--accent-muted)",
          }}
        >
          <BarLoader />
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </p>
        <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </p>
      </div>
    </AppPanel>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return <LoadingPanel className={className} rows={2} />;
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] px-6 py-4">
      {Array.from({ length: columns }).map((_, index) => (
        <LoadingBlock
          key={index}
          className="h-4 rounded-[var(--radius-sm)]"
          style={{ width: `${100 / columns}%` }}
        />
      ))}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <LoadingCenteredPanel
        title="Loading view"
        description="Preparing data, layout, and controls."
        className="w-full max-w-lg"
        minHeight={260}
      />
    </div>
  );
}

export function Spinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <svg
      className={cn("animate-spin text-accent-primary", sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z"
      />
    </svg>
  );
}
