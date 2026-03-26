import Link from "next/link";

import { BrandMark } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import {
  IconAnalytics,
  IconJournal,
  IconPlaybooks,
} from "@/components/ui/icons";
import { AppPanel } from "@/components/ui/page-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const FEATURE_ITEMS: Array<{
  title: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
    size?: number;
    strokeWidth?: number;
  }>;
}> = [
  {
    title: "Structured journaling",
    description: "Capture execution, psychology, and follow-up lessons in one workflow.",
    icon: IconJournal,
  },
  {
    title: "Account-aware analytics",
    description: "Review sessions, risk, and performance by the account you are actually trading.",
    icon: IconAnalytics,
  },
  {
    title: "Reliable review loop",
    description: "Keep your playbooks, dashboard, and journal tied to the same trading process.",
    icon: IconPlaybooks,
  },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-dvh" style={{ background: "var(--app-bg)" }}>
      <div className="min-h-dvh px-4 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-6xl items-center sm:min-h-[calc(100dvh-4rem)] lg:min-h-[calc(100dvh-5rem)]">
          <div className="grid w-full gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] xl:gap-6">
            <AppPanel className="order-2 flex min-w-0 flex-col gap-6 p-5 sm:p-6 lg:p-7 xl:order-1 xl:p-8">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <BrandMark size={42} className="sm:[&]:h-11 sm:[&]:w-11" />
                <div className="min-w-0">
                  <p
                    style={{
                      fontSize: "0.48rem",
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.25em",
                      fontWeight: 700,
                      marginBottom: "3px",
                    }}
                  >
                    Trading Journal
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-syne, sans-serif)",
                      fontWeight: 800,
                      fontSize: "clamp(1.9rem, 4vw, 2.5rem)",
                      letterSpacing: "-0.05em",
                      color: "var(--text-primary)",
                      lineHeight: 1,
                    }}
                  >
                    TradeLog
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p
                  className="max-w-2xl text-sm leading-relaxed sm:text-[0.95rem]"
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

              <InsetPanel
                className="md:hidden"
                paddingClassName="px-4 py-3"
                tone="accent"
              >
                <p className="text-sm font-medium">One trading workspace.</p>
                <p
                  className="mt-1 text-sm leading-relaxed"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Journal, review, analytics, and playbooks stay tied to the
                  same trading process.
                </p>
              </InsetPanel>

              <div className="hidden gap-3 md:grid md:grid-cols-3 xl:grid-cols-1">
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
                          <Icon
                            className="h-4 w-4"
                            size={16}
                            strokeWidth={1.7}
                          />
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

            <AppPanel className="order-1 min-w-0 p-5 sm:mx-auto sm:w-full sm:max-w-[34rem] sm:p-6 lg:max-w-[36rem] lg:p-7 xl:order-2 xl:max-w-none xl:p-8">
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
            </AppPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
