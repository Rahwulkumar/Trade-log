"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Download, TrendingUp, TrendingDown, Target, DollarSign, Loader2 } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { 
  getAnalyticsSummary, 
  getMonthlyPerformance,
  getPerformanceByDay,
  type AnalyticsSummary,
  type MonthlyPerformance,
  type DayPerformance,
} from "@/lib/api/analytics";
import { getTrades } from "@/lib/api/trades";
import type { Trade } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId } = usePropAccount();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformance[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    async function loadAnalytics() {
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Apply global prop account filter
        const propAccountIdFilter = selectedAccountId === "unassigned" ? "unassigned" : selectedAccountId;
        
        const [analyticsData, monthlyPerfData, tradesData] = await Promise.all([
          getAnalyticsSummary(undefined, undefined, propAccountIdFilter),
          getMonthlyPerformance(propAccountIdFilter),
          getTrades({ status: "closed", propAccountId: propAccountIdFilter }),
        ]);

        setStats(analyticsData);
        setMonthlyData(monthlyPerfData);
        setTrades(tradesData);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadAnalytics();
    }
  }, [user, isConfigured, authLoading, selectedAccountId]);

  // Calculate win/loss data for pie chart
  const winLossData = stats ? [
    { name: "Wins", value: stats.winningTrades, color: "#22c55e" },
    { name: "Losses", value: stats.losingTrades, color: "#ef4444" },
  ] : [];

  // Calculate asset performance from trades
  const assetPerformance = trades.reduce((acc, trade) => {
    const existing = acc.find(a => a.asset === trade.symbol);
    if (existing) {
      existing.trades++;
      existing.pnl += trade.pnl;
      if (trade.pnl > 0) existing.wins++;
    } else {
      acc.push({
        asset: trade.symbol,
        trades: 1,
        wins: trade.pnl > 0 ? 1 : 0,
        pnl: trade.pnl,
      });
    }
    return acc;
  }, [] as { asset: string; trades: number; wins: number; pnl: number }[])
    .map(a => ({ ...a, winRate: a.trades > 0 ? (a.wins / a.trades) * 100 : 0 }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 10);

  // Calculate R-multiple distribution
  const rMultipleDistribution = trades.reduce((acc, trade) => {
    if (trade.r_multiple === null) return acc;
    const r = trade.r_multiple;
    let range: string;
    if (r <= -3) range = "-3R+";
    else if (r <= -2) range = "-2R";
    else if (r <= -1) range = "-1R";
    else if (r < 1) range = "0R";
    else if (r < 2) range = "+1R";
    else if (r < 3) range = "+2R";
    else range = "+3R+";
    
    const existing = acc.find(a => a.range === range);
    if (existing) existing.count++;
    else acc.push({ range, count: 1 });
    return acc;
  }, [] as { range: string; count: number }[]);

  // Ensure all ranges exist
  const allRanges = ["-3R+", "-2R", "-1R", "0R", "+1R", "+2R", "+3R+"];
  const sortedRDistribution = allRanges.map(range => {
    const found = rMultipleDistribution.find(r => r.range === range);
    return found || { range, count: 0 };
  });

  // Format monthly data for chart
  const chartMonthlyData = monthlyData.map(m => ({
    month: m.month,
    net: m.totalPnl,
    profit: m.totalPnl > 0 ? m.totalPnl : 0,
    loss: m.totalPnl < 0 ? m.totalPnl : 0,
  }));

  // Auth checks
  if (!authLoading && !isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card-void p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Supabase Not Configured</h2>
          <p className="text-muted-foreground">Please add your Supabase credentials.</p>
        </div>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card-void p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to view analytics.</p>
          <a href="/auth/login" className="btn-glow">Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-label mb-1">Performance</p>
          <h1 className="headline-lg">Analytics</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="all">
            <SelectTrigger className="w-[150px] bg-void-surface border-white/10">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1w">Last 7 Days</SelectItem>
              <SelectItem value="1m">Last Month</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <button className="btn-void">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!loading && trades.length === 0 && (
        <div className="card-void p-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No trades to analyze yet. Start logging trades to see your analytics!</p>
          <a href="/trades" className="btn-glow">Go to Trades</a>
        </div>
      )}

      {/* Analytics Content */}
      {!loading && trades.length > 0 && (
        <>
          {/* Key Metrics */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-void p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-label">Profit Factor</span>
                <TrendingUp className="h-4 w-4 profit" />
              </div>
              <p className="stat-large">
                {stats?.profitFactor === Infinity ? "∞" : (stats?.profitFactor || 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Above 1.5 is good</p>
            </div>
            <div className="card-void p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-label">Expectancy</span>
                <DollarSign className="h-4 w-4 profit" />
              </div>
              <p className={cn("stat-large", (stats?.expectancy || 0) >= 0 ? "profit" : "loss")}>
                {(stats?.expectancy || 0) >= 0 ? "+" : ""}${(stats?.expectancy || 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Per trade average</p>
            </div>
            <div className="card-void p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-label">Largest Win</span>
                <TrendingUp className="h-4 w-4 profit" />
              </div>
              <p className="stat-large profit">+${(stats?.largestWin || 0).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Best single trade</p>
            </div>
            <div className="card-void p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-label">Largest Loss</span>
                <TrendingDown className="h-4 w-4 loss" />
              </div>
              <p className="stat-large loss">-${(stats?.largestLoss || 0).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Worst single trade</p>
            </div>
          </section>

          {/* Charts */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-void-surface border border-white/10">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">By Asset</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Monthly P&L Chart */}
                <div className="card-void p-6">
                  <h3 className="headline-md mb-2">Monthly P&L</h3>
                  <p className="text-sm text-muted-foreground mb-6">Profit and loss by month</p>
                  <div className="h-[280px]">
                    {chartMonthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartMonthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                          <XAxis dataKey="month" tick={{ fill: "#52525b", fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fill: "#52525b", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                          <Tooltip 
                            contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                            labelStyle={{ color: "#fff" }}
                          />
                          <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                            {chartMonthlyData.map((entry, index) => (
                              <Cell key={index} fill={entry.net >= 0 ? "#22c55e" : "#ef4444"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No monthly data yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Win/Loss Pie Chart */}
                <div className="card-void p-6">
                  <h3 className="headline-md mb-2">Win Rate</h3>
                  <p className="text-sm text-muted-foreground mb-6">Winning vs losing trades</p>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={winLossData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {winLossData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 -mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm">Wins {stats?.winRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-sm">Losses {(100 - (stats?.winRate || 0)).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="card-void p-6">
                <h3 className="headline-md mb-2">Performance by Asset</h3>
                <p className="text-sm text-muted-foreground mb-6">Trading results by instrument</p>
                {assetPerformance.length > 0 ? (
                  <div className="space-y-2">
                    {assetPerformance.map((asset) => (
                      <div key={asset.asset} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/5">
                        <div className="flex items-center gap-4">
                          <span className="font-medium w-24">{asset.asset}</span>
                          <span className="badge-void text-xs">{asset.trades} trades</span>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Win Rate</div>
                            <div className="font-medium">{asset.winRate.toFixed(1)}%</div>
                          </div>
                          <div className="text-center w-24">
                            <div className="text-xs text-muted-foreground">P&L</div>
                            <div className={`font-medium mono ${asset.pnl >= 0 ? "profit" : "loss"}`}>
                              {asset.pnl >= 0 ? "+" : ""}${asset.pnl.toFixed(0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No asset data yet</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="distribution" className="space-y-4">
              <div className="card-void p-6">
                <h3 className="headline-md mb-2">R-Multiple Distribution</h3>
                <p className="text-sm text-muted-foreground mb-6">Trade outcomes by R-multiple</p>
                <div className="h-[300px]">
                  {sortedRDistribution.some(r => r.count > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sortedRDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="range" tick={{ fill: "#52525b", fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: "#52525b", fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {sortedRDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.range.startsWith("-") ? "#ef4444" : "#22c55e"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No R-multiple data (add stop losses to your trades)
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
