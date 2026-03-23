"use client";

import { ReactNode } from "react";

import { IconArrowDown, IconArrowUp } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type MetricTone = "neutral" | "profit" | "loss";

interface DashboardMetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  tone?: MetricTone;
  trend?: string;
  trendLabel?: string;
  trendPositive?: boolean;
}

interface DashboardAccountCardProps {
  ownerLabel: string;
  accountName: string;
  statusLabel: string;
  statusVariant: "account" | "scope";
  metricLabel: string;
  metricValue: string;
  helper?: string | null;
}

interface DashboardMiniMetricProps {
  label: string;
  value: string;
  helper?: string;
  tone?: MetricTone;
  align?: "left" | "center";
  icon?: ReactNode;
}

function getToneColor(tone: MetricTone) {
  if (tone === "profit") return "var(--profit-primary)";
  if (tone === "loss") return "var(--loss-primary)";
  return "var(--text-primary)";
}

export function DashboardMetricCard({
  label,
  value,
  subtitle,
  tone = "neutral",
  trend,
  trendLabel,
  trendPositive,
}: DashboardMetricCardProps) {
  const toneColor = getToneColor(tone);

  return (
    <article className="surface flex h-full min-h-[188px] flex-col justify-between p-5">
      <div className="space-y-3">
        <p className="text-label">{label}</p>
        <p className="stat-large" style={{ color: toneColor }}>
          {value}
        </p>
        {subtitle ? (
          <p
            style={{
              fontSize: "0.74rem",
              color: "var(--text-tertiary)",
              lineHeight: 1.55,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      {trend ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "badge-base flex items-center gap-1",
              trendPositive ? "badge-profit" : "badge-loss",
            )}
            style={{
              borderRadius: "999px",
              fontSize: "0.63rem",
              padding: "0.18rem 0.6rem",
              fontWeight: 600,
            }}
          >
            {trendPositive ? (
              <IconArrowUp size={9} strokeWidth={2.5} />
            ) : (
              <IconArrowDown size={9} strokeWidth={2.5} />
            )}
            {trend}
          </span>
          {trendLabel ? (
            <span
              style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}
            >
              {trendLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function DashboardAccountCard({
  ownerLabel,
  accountName,
  statusLabel,
  statusVariant,
  metricLabel,
  metricValue,
  helper,
}: DashboardAccountCardProps) {
  return (
    <article
      className="surface flex h-full min-h-[188px] flex-col justify-between p-5"
      style={{
        background: `
          radial-gradient(ellipse at 0% 100%, color-mix(in srgb, var(--accent-primary) 14%, transparent) 0%, transparent 58%),
          var(--surface)
        `,
      }}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="truncate"
              style={{
                fontWeight: 700,
                fontSize: "0.92rem",
                color: "var(--text-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                lineHeight: 1.2,
              }}
            >
              {ownerLabel}
            </p>
            <p
              className="truncate"
              style={{
                fontSize: "0.68rem",
                color: "var(--text-tertiary)",
                marginTop: "3px",
                lineHeight: 1.45,
              }}
            >
              {accountName}
            </p>
          </div>

          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[0.64rem] font-semibold",
              statusVariant === "account" ? "badge-accent capitalize" : "badge-toggle-on",
            )}
          >
            {statusLabel}
          </span>
        </div>

        <div>
          <p className="text-label mb-1">{metricLabel}</p>
          <p
            className="mono"
            style={{
              fontSize: "1.7rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.14,
              letterSpacing: "-0.02em",
            }}
          >
            {metricValue}
          </p>
          {helper ? (
            <p
              style={{
                marginTop: "0.35rem",
                fontSize: "0.7rem",
                color: "var(--text-tertiary)",
                lineHeight: 1.5,
              }}
            >
              {helper}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex h-9 items-end gap-0.5">
        {[0.4, 0.6, 0.5, 0.75, 0.55, 0.9, 0.7, 0.85, 1.0, 0.8, 0.95, 0.6].map(
          (height, index) => (
            <div
              key={index}
              className="flex-1 rounded-sm"
              style={{
                height: `${height * 100}%`,
                background:
                  index % 3 === 0
                    ? "color-mix(in srgb, var(--accent-primary) 55%, transparent)"
                    : "color-mix(in srgb, var(--accent-primary) 20%, transparent)",
              }}
            />
          ),
        )}
      </div>
    </article>
  );
}

export function DashboardMiniMetric({
  label,
  value,
  helper,
  tone = "neutral",
  align = "left",
  icon,
}: DashboardMiniMetricProps) {
  const toneColor = getToneColor(tone);

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border px-4 py-4",
        align === "center" ? "text-center" : "text-left",
      )}
      style={{
        background: "var(--surface-elevated)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div
        className={cn(
          "mb-2 flex gap-2",
          align === "center"
            ? "justify-center"
            : "items-center justify-between",
        )}
      >
        <p className="text-label">{label}</p>
        {icon ? <span className="shrink-0">{icon}</span> : null}
      </div>
      <p
        className="mono"
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: toneColor,
          lineHeight: 1.2,
        }}
      >
        {value}
      </p>
      {helper ? (
        <p
          style={{
            marginTop: "0.45rem",
            fontSize: "0.7rem",
            color: "var(--text-tertiary)",
            lineHeight: 1.5,
          }}
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}
