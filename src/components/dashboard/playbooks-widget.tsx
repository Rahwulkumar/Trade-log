"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { LoadingListRows } from "@/components/ui/loading";
import { ListItemRow } from "@/components/ui/surface-primitives";
import { NoDataEmpty } from "@/components/ui/empty-state";
import {
  getAllPlaybooksWithStats,
  type PlaybookStats,
} from "@/lib/api/client/playbooks";
import { getPnLColor } from "@/lib/utils/trade-colors";

interface TopPlaybooksProps {
  propAccountId?: string | null;
  initialPlaybooks?: PlaybookStats[];
}

export function TopPlaybooks({
  propAccountId,
  initialPlaybooks,
}: TopPlaybooksProps) {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const [playbooks, setPlaybooks] = useState<PlaybookStats[]>(
    initialPlaybooks ?? [],
  );
  const [loading, setLoading] = useState(!initialPlaybooks);

  useEffect(() => {
    if (initialPlaybooks) return;

    async function loadPlaybooks() {
      if (authLoading) return;
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }

      try {
        const data = await getAllPlaybooksWithStats(propAccountId);
        const sorted = data
          .sort((a, b) => b.totalPnl - a.totalPnl)
          .slice(0, 4);
        setPlaybooks(sorted);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("Failed to fetch")) {
          console.error("Failed to load playbooks:", err);
        }
      } finally {
        setLoading(false);
      }
    }

    void loadPlaybooks();
  }, [authLoading, initialPlaybooks, isConfigured, propAccountId, user]);

  if (loading) {
    return <LoadingListRows count={3} compact className="px-1" />;
  }

  if (playbooks.length === 0) {
    return (
      <div className="py-4">
        <NoDataEmpty />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {playbooks.map((pb) => {
        const pnlColor = getPnLColor(pb.totalPnl);

        return (
          <ListItemRow
            key={pb.playbook.id}
            leading={
              <div className="flex min-w-0 items-center gap-3">
                {pb.totalPnl >= 0 ? (
                  <TrendingUp
                    className="h-4 w-4 shrink-0"
                    style={{ color: "var(--profit-primary)" }}
                  />
                ) : (
                  <TrendingDown
                    className="h-4 w-4 shrink-0"
                    style={{ color: "var(--loss-primary)" }}
                  />
                )}
                <div className="min-w-0">
                  <p
                    className="truncate text-[0.8125rem] font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {pb.playbook.name}
                  </p>
                  <p
                    className="text-[0.7rem]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {pb.totalTrades} trades - {pb.winRate.toFixed(1)}% win rate
                  </p>
                </div>
              </div>
            }
            trailing={
              <span
                className="shrink-0 text-[0.875rem] font-semibold"
                style={{ fontFamily: "var(--font-jb-mono)", color: pnlColor }}
              >
                {pb.totalPnl >= 0 ? "+" : "-"}$
                {Math.abs(pb.totalPnl).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            }
          />
        );
      })}
    </div>
  );
}
