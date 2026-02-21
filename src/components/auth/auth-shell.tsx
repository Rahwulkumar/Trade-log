import Link from "next/link";
import { BarChart3 } from "lucide-react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  alternateHref: string;
  alternateLabel: string;
  alternateCta: string;
  children: React.ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  alternateHref,
  alternateLabel,
  alternateCta,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[1.05fr_1fr]">
        <section className="surface flex flex-col justify-between p-8">
          <div>
            <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="headline-lg">TradeLog</h1>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Journal, review, and improve your trading process with structured
              analytics and execution notes.
            </p>
          </div>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            <li className="rounded-md border border-border-subtle bg-muted/20 px-3 py-2">
              Track every trade with context and screenshots.
            </li>
            <li className="rounded-md border border-border-subtle bg-muted/20 px-3 py-2">
              Review performance by account, strategy, and period.
            </li>
            <li className="rounded-md border border-border-subtle bg-muted/20 px-3 py-2">
              Build consistent feedback loops with journal workflows.
            </li>
          </ul>
        </section>

        <section className="surface p-8">
          <header className="mb-6">
            <h2 className="headline-md">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </header>

          {children}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {alternateLabel}{" "}
            <Link
              href={alternateHref}
              className="font-medium text-accent-primary hover:underline"
            >
              {alternateCta}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
