"use client";

import { cn } from "@/lib/utils";

interface DashboardAccountCardProps {
  ownerLabel: string;
  accountName: string;
  statusLabel: string;
  statusVariant: "account" | "scope";
  metricLabel: string;
  metricValue: string;
  helper?: string | null;
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
              statusVariant === "account"
                ? "badge-accent capitalize"
                : "badge-toggle-on",
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
