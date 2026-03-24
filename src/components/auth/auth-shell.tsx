import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  BarChart3,
  BookOpenText,
  LineChart,
  ShieldCheck,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { AppPanel } from "@/components/ui/page-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";

interface AuthShellProps {
  title: string;
  subtitle: string;
  alternateHref: string;
  alternateLabel: string;
  alternateCta: string;
  children: React.ReactNode;
}

const FEATURE_ITEMS: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Structured journaling",
    description: "Capture execution, psychology, and follow-up lessons in one workflow.",
    icon: BookOpenText,
  },
  {
    title: "Account-aware analytics",
    description: "Review sessions, risk, and performance by the account you are actually trading.",
    icon: LineChart,
  },
  {
    title: "Reliable review loop",
    description: "Keep your playbooks, dashboard, and journal tied to the same trading process.",
    icon: ShieldCheck,
  },
];

export function AuthShell({
  title,
  subtitle,
  alternateHref,
  alternateLabel,
  alternateCta,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen" style={{ background: "var(--app-bg)" }}>
      <PageShell className="min-h-screen py-10">
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_1fr]">
          <AppPanel className="flex flex-col justify-between gap-8 p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)]"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent-primary)",
                  }}
                >
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-label">Trading Journal</p>
                  <h1 className="headline-lg">TradeLog</h1>
                </div>
              </div>

              <div className="space-y-3">
                <p
                  className="max-w-md text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Journal, review, and improve your trading process with the
                  same analytics and account context used across the app.
                </p>
                <Button asChild variant="link" className="h-auto p-0 text-sm">
                  <Link href="/">Back to overview</Link>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {FEATURE_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <InsetPanel key={item.title} paddingClassName="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-default)]"
                        style={{
                          background: "var(--surface)",
                          color: "var(--accent-primary)",
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {item.title}
                        </p>
                        <p
                          className="mt-1 text-sm leading-relaxed"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </InsetPanel>
                );
              })}
            </div>
          </AppPanel>

          <AppPanel className="p-8">
            <header className="mb-6 space-y-2">
              <p className="text-label">Authentication</p>
              <h2 className="headline-md">{title}</h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {subtitle}
              </p>
            </header>

            {children}

            <InsetPanel className="mt-6" paddingClassName="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {alternateLabel}
                </p>
                <Button asChild variant="link" className="h-auto p-0">
                  <Link href={alternateHref}>{alternateCta}</Link>
                </Button>
              </div>
            </InsetPanel>
          </AppPanel>
        </div>
      </PageShell>
    </div>
  );
}
