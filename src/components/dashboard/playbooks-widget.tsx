"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import {
  getAllPlaybooksWithStats,
  type PlaybookStats,
} from "@/lib/api/client/playbooks";

interface TopPlaybooksProps {
  propAccountId?: string | null;
}

export function TopPlaybooks({ propAccountId }: TopPlaybooksProps) {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const [playbooks, setPlaybooks] = useState<PlaybookStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [authLoading, user, isConfigured, propAccountId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (playbooks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No playbooks yet. Create your trading strategies!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {playbooks.map((pb) => (
        <div
          key={pb.playbook.id}
          className="flex cursor-pointer items-center justify-between rounded-lg border border-border-subtle bg-muted/20 p-4 transition-colors hover:bg-accent/40"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {pb.totalPnl >= 0 ? (
                <TrendingUp className="h-4 w-4 text-[var(--profit-primary)]" />
              ) : (
                <TrendingDown className="h-4 w-4 text-[var(--loss-primary)]" />
              )}
              <span className="font-medium">{pb.playbook.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-sm text-muted-foreground">
                {pb.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="text-right w-24">
              <span
                className={cn(
                  "font-semibold mono",
                  pb.totalPnl >= 0 ? "profit" : "loss",
                )}
              >
                {pb.totalPnl >= 0 ? "+" : ""}$
                {Math.abs(pb.totalPnl).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
