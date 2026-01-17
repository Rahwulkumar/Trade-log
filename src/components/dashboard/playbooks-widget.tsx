"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { getAllPlaybooksWithStats, type PlaybookStats } from "@/lib/api/playbooks";

interface TopPlaybooksProps {
  propAccountId?: string | null;
}

export function TopPlaybooks({ propAccountId }: TopPlaybooksProps) {
  const { user, isConfigured } = useAuth();
  const [playbooks, setPlaybooks] = useState<PlaybookStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlaybooks() {
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
        console.error("Failed to load playbooks:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPlaybooks();
  }, [user, isConfigured, propAccountId]);

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
          className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer border border-transparent hover:border-white/5"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {pb.totalPnl >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="font-medium">{pb.playbook.name}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-sm text-muted-foreground">{pb.winRate.toFixed(1)}%</span>
            </div>
            <div className="text-right w-24">
              <span className={cn("font-semibold mono", pb.totalPnl >= 0 ? "profit" : "loss")}>
                {pb.totalPnl >= 0 ? "+" : ""}${Math.abs(pb.totalPnl).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
