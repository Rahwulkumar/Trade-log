"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Loader2 } from "lucide-react";
import { EquityCurve } from "@/components/dashboard/equity-curve"; 
import { PerformanceByDay } from "@/components/dashboard/performance-by-day";
import { TopPlaybooks } from "@/components/dashboard/playbooks-widget";
import { RecentTrades } from "@/components/dashboard/recent-trades";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { getAnalyticsSummary, getTodayStats, type AnalyticsSummary } from "@/lib/api/analytics";
import { getActivePropAccounts, checkCompliance } from "@/lib/api/prop-accounts";
import type { PropAccount } from "@/lib/supabase/types";

interface PropAccountWithCompliance extends PropAccount {
  compliance?: {
    profitProgress: number | null;
  };
}

export default function DashboardPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId, propAccounts } = usePropAccount();
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [todayStats, setTodayStats] = useState<{ pnl: number; trades: number } | null>(null);
  const [propAccount, setPropAccount] = useState<PropAccountWithCompliance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }

      try {
        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

        // Pass selectedAccountId to analytics (use global context value)
        const propAccountIdFilter = selectedAccountId === "unassigned" ? "unassigned" : selectedAccountId;

        const [analyticsData, todayData] = await Promise.all([
          getAnalyticsSummary(startOfMonth, endOfMonth, propAccountIdFilter),
          getTodayStats(propAccountIdFilter),
        ]);

        setStats(analyticsData);
        setTodayStats(todayData);

        // Handle Prop Firm card based on selection
        if (selectedAccountId && selectedAccountId !== "unassigned") {
          // Show selected account
          const account = propAccounts.find((a: PropAccount) => a.id === selectedAccountId);
          if (account) {
            const compliance = await checkCompliance(account.id);
            setPropAccount({ ...account, compliance: { profitProgress: compliance.profitProgress } });
          } else {
            setPropAccount(null);
          }
        } else if (selectedAccountId === "unassigned") {
          // Hide prop card for unassigned trades
          setPropAccount(null);
        } else if (propAccounts.length > 0) {
          // "All Accounts" - show first account as summary (or could aggregate)
          const account = propAccounts[0];
          const compliance = await checkCompliance(account.id);
          setPropAccount({ ...account, compliance: { profitProgress: compliance.profitProgress } });
        } else {
          setPropAccount(null);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadDashboardData();
    }
  }, [user, isConfigured, authLoading, selectedAccountId, propAccounts]);

  const monthName = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Calculate week stats (last 7 days) - simplified for now
  const weekPnl = stats ? stats.totalPnl : 0;

  return (
    <div className="space-y-12">
      {/* Hero Stats - Fey style, huge and centered */}
      <section className="text-center space-y-6 py-8">
        <p className="text-label">{monthName} Performance</p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <h1 className="headline-xl">
              <span className={stats && stats.totalPnl >= 0 ? "profit" : "loss"}>
                {stats && stats.totalPnl >= 0 ? "+" : ""}
                ${stats ? Math.floor(Math.abs(stats.totalPnl)).toLocaleString() : "0"}
              </span>
              <span className="text-muted-foreground">
                .{stats ? Math.abs(stats.totalPnl % 1).toFixed(2).slice(2) : "00"}
              </span>
            </h1>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="font-semibold">{stats ? stats.winRate.toFixed(1) : "0"}%</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Profit Factor</span>
                <span className="font-semibold">
                  {stats && stats.profitFactor !== Infinity ? stats.profitFactor.toFixed(1) : "∞"}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Trades</span>
                <span className="font-semibold">{stats?.totalTrades || 0}</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Quick Stats Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-void p-6 text-center">
          <p className="text-label mb-2">Today</p>
          <p className={cn("stat-large", (todayStats?.pnl || 0) >= 0 ? "profit" : "loss")}>
            {(todayStats?.pnl || 0) >= 0 ? "+" : ""}${(todayStats?.pnl || 0).toFixed(0)}
          </p>
        </div>
        <div className="card-void p-6 text-center">
          <p className="text-label mb-2">This Month</p>
          <p className={cn("stat-large", (stats?.totalPnl || 0) >= 0 ? "profit" : "loss")}>
            {(stats?.totalPnl || 0) >= 0 ? "+" : ""}${(stats?.totalPnl || 0).toFixed(0).toLocaleString()}
          </p>
        </div>
        <div className="card-void p-6 text-center">
          <p className="text-label mb-2">Avg R:R</p>
          <p className="stat-large">{stats?.avgRMultiple?.toFixed(1) || "0"}</p>
        </div>
        <div className="card-void p-6 text-center">
          <p className="text-label mb-2">Best Trade</p>
          <p className="stat-large profit">+${stats?.largestWin?.toFixed(0) || "0"}</p>
        </div>
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve */}
        <div className="card-void p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="headline-md">Equity Curve</h2>
              <p className="text-sm text-muted-foreground">Account growth over time</p>
            </div>
            <div className="flex gap-2">
              {["1W", "1M", "3M", "YTD"].map((period) => (
                <button
                  key={period}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    period === "1M"
                      ? "bg-white/10 text-white"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px]">
            <EquityCurve propAccountId={selectedAccountId} />
          </div>
        </div>

        {/* Daily Performance */}
        <div className="card-void p-6">
          <h2 className="headline-md mb-2">Daily Performance</h2>
          <p className="text-sm text-muted-foreground mb-6">P&L by weekday</p>
          <PerformanceByDay propAccountId={selectedAccountId} />
        </div>
      </section>

      {/* Bottom Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Playbooks */}
        <div className="card-void p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="headline-md">Top Strategies</h2>
              <p className="text-sm text-muted-foreground">Performance by playbook</p>
            </div>
            <Link href="/playbooks" className="text-sm text-muted-foreground hover:text-white transition-colors">
              View all →
            </Link>
          </div>
          <TopPlaybooks propAccountId={selectedAccountId} />
        </div>

        {/* Prop Firm */}
        <div className="card-glow p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="headline-md">{propAccount?.name || "No Active Account"}</h2>
                <p className="text-sm text-muted-foreground">
                  {propAccount ? `$${propAccount.initial_balance.toLocaleString()} Account` : "Add a prop account to track"}
                </p>
              </div>
            </div>
            {propAccount && (
              <span className="badge-void text-green-400 border-green-400/20 bg-green-400/10">
                {propAccount.status}
              </span>
            )}
          </div>
          
          {propAccount ? (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-label">Current Balance</p>
                  <p className="stat-large mt-1">${propAccount.current_balance.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-label">Profit Target</p>
                  <p className="stat-large mt-1 profit">${propAccount.profit_target?.toLocaleString() || "N/A"}</p>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{(propAccount.compliance?.profitProgress || 0).toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" 
                    style={{ width: `${Math.min(propAccount.compliance?.profitProgress || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-label">Daily DD Used</p>
                  <p className="text-lg font-semibold loss mt-1">
                    -{propAccount.daily_dd_current.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">of {propAccount.daily_dd_max}%</p>
                </div>
                <div>
                  <p className="text-label">Total DD Used</p>
                  <p className="text-lg font-semibold loss mt-1">
                    -{propAccount.total_dd_current.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">of {propAccount.total_dd_max}%</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active prop account</p>
              <Link href="/prop-firm" className="text-cyan-400 hover:underline mt-2 inline-block">
                Add an account →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Recent Trades */}
      <section className="card-void p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="headline-md">Recent Trades</h2>
            <p className="text-sm text-muted-foreground">Your latest trading activity</p>
          </div>
          <Link href="/trades" className="btn-void text-sm">
            View all trades
          </Link>
        </div>
        <RecentTrades propAccountId={selectedAccountId} />
      </section>
    </div>
  );
}
