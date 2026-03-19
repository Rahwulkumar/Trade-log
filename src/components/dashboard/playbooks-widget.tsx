"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import {
  getAllPlaybooksWithStats,
  type PlaybookStats,
} from "@/lib/api/client/playbooks";
import { NoDataEmpty } from "@/components/ui/empty-state";
import { getPnLColor } from "@/lib/utils/trade-colors";

interface TopPlaybooksProps {
  propAccountId?: string | null;
  /** Pre-fetched playbooks from parent — skips internal fetch when provided */
  initialPlaybooks?: PlaybookStats[];
}

export function TopPlaybooks({ propAccountId, initialPlaybooks }: TopPlaybooksProps) {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const [playbooks, setPlaybooks] = useState<PlaybookStats[]>(initialPlaybooks ?? []);
  const [loading, setLoading] = useState(!initialPlaybooks);

  useEffect(() => {
    // Skip fetch if parent already provided data
    if (initialPlaybooks) return;

    async function loadPlaybooks() {
      if (authLoading) return;
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }

      try {
        const data = await getAllPlaybooksWithStats(propAccountId);
        // Sort by total P&L and take top 4
        const sorted = data.sort((a, b) => b.totalPnl - a.totalPnl).slice(0, 4);
        setPlaybooks(sorted);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("Failed to fetch"))
          console.error("Failed to load playbooks:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPlaybooks();
  }, [authLoading, user, isConfigured, propAccountId, initialPlaybooks]);

  if (loading) {
    return (
      <div className="space-y-2 px-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton h-14 rounded-lg"
            style={{ borderRadius: "var(--radius-md)" }}
          />
        ))}
      </div>
    );
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
          <div
            key={pb.playbook.id}
            className="flex items-center justify-between p-4"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {pb.totalPnl >= 0 ? (
                <TrendingUp className="h-4 w-4 shrink-0" style={{ color: "var(--profit-primary)" }} />
              ) : (
                <TrendingDown className="h-4 w-4 shrink-0" style={{ color: "var(--loss-primary)" }} />
              )}
              <div className="min-w-0">
                <p
                  className="text-[0.8125rem] font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {pb.playbook.name}
                </p>
                <p className="text-[0.7rem]" style={{ color: "var(--text-tertiary)" }}>
                  {pb.totalTrades} trades · {pb.winRate.toFixed(1)}% win
                </p>
              </div>
            </div>

            <span
              className="text-[0.875rem] font-semibold shrink-0"
              style={{ fontFamily: "var(--font-jb-mono)", color: pnlColor }}
            >
              {pb.totalPnl >= 0 ? "+" : "−"}${Math.abs(pb.totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
