"use client";

/* DESIGN DECISION:
 * The page is built as two dashboard-style cards sitting in the same workspace:
 * the strategy library on the left and a live strategy card on the right. That
 * keeps the editing surface visible without letting it take over the entire
 * page.
 *
 * The eye lands on the page header, then drops into the library card, then
 * crosses naturally into the strategy card. Once a strategy is opened, the
 * right-hand card behaves like the equity-curve and drawdown panels elsewhere
 * in the app: summary metrics first, then the editable detail below.
 *
 * It is different from a generic implementation because opening a strategy no
 * longer swaps the whole page into a form. The library remains in place, and
 * the strategy itself becomes a contained working card built from the same
 * reusable surfaces and metric blocks as the rest of the product.
 */

import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { StrategyStudio } from "@/components/strategies/strategy-studio";
import { Button } from "@/components/ui/button";
import { IconStrategies } from "@/components/ui/icons";
import { AppPageHeader, AppPanelEmptyState } from "@/components/ui/page-primitives";

export default function StrategiesPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId } = usePropAccount();

  if (!authLoading && !isConfigured) {
    return (
      <div className="page-root page-sections">
        <AppPageHeader
          eyebrow="Strategies"
          title="Strategies"
          description="Create and maintain your strategy rule sets."
          icon={<IconStrategies size={18} strokeWidth={1.8} />}
        />
        <AppPanelEmptyState
          className="max-w-xl"
          title="Configuration Required"
          description="Add your Supabase credentials before working on strategies."
          minHeight={180}
        />
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="page-root page-sections">
        <AppPageHeader
          eyebrow="Strategies"
          title="Strategies"
          description="Create and maintain your strategy rule sets."
          icon={<IconStrategies size={18} strokeWidth={1.8} />}
        />
        <AppPanelEmptyState
          className="max-w-xl"
          title="Login Required"
          description="Sign in to create strategies and define the rule sets attached to them."
          action={
            <Button asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          }
          minHeight={200}
        />
      </div>
    );
  }

  return <StrategyStudio selectedAccountId={selectedAccountId} />;
}
