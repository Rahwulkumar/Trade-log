"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/components/auth-provider";
import { getEquityCurve } from "@/lib/api/analytics";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { IconLoader } from "@/components/ui/icons";
import { CHART_GRADIENT_RGB } from "@/lib/constants/chart-colors";
import { getPeriodStartDate } from "@/lib/utils/date-range";

type Period = "1W" | "1M" | "3M" | "YTD";

interface EquityCurveProps {
  startingBalance?: number;
  propAccountId?: string | null;
  period?: Period;
}

export function EquityCurve({
  startingBalance = 0,
  propAccountId,
  period = "1M",
}: EquityCurveProps) {
  const { user, isConfigured } = useAuth();
  const [allData, setAllData] = useState<
    { date: string; balance: number; rawDate: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEquityCurve() {
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }
      try {
        const curveData = await getEquityCurve(
          startingBalance,
          undefined,
          undefined,
          propAccountId,
        );
        const formattedData = curveData.map((point) => ({
          rawDate: point.date,
          date: new Date(point.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          balance: point.balance,
        }));
        setAllData(formattedData);
      } catch (err) {
        console.error("Failed to load equity curve:", err);
      } finally {
        setLoading(false);
      }
    }
    loadEquityCurve();
  }, [user, isConfigured, startingBalance, propAccountId]);

  // Filter by selected period
  const data = useMemo(() => {
    const cutoff = getPeriodStartDate(period);
    if (!cutoff) return allData;
    return allData.filter((d) => d.rawDate >= cutoff);
  }, [allData, period]);

  const isProfit =
    data.length >= 2 ? data[data.length - 1].balance >= data[0].balance : true;
  const strokeColor = isProfit
    ? "var(--profit-primary)"
    : "var(--loss-primary)";
  const gradientColor = isProfit ? CHART_GRADIENT_RGB.profit : CHART_GRADIENT_RGB.loss;

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-full gap-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        <IconLoader size={18} className="text-[var(--accent-primary)]" />
        <span style={{ fontSize: "0.8rem" }}>Loading curve…</span>
      </div>
    );
  }

  if (data.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
          No data for this period
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`rgba(${gradientColor},0.20)`} />
              <stop offset="100%" stopColor={`rgba(${gradientColor},0.00)`} />
            </linearGradient>
          </defs>
          {/* Only a zero-reference line, no full grid */}
          <ReferenceLine
            y={data[0]?.balance}
            stroke="var(--border-default)"
            strokeDasharray="4 3"
            strokeWidth={1}
          />
          <XAxis
            dataKey="date"
            tick={{
              fill: "var(--text-tertiary)",
              fontSize: 10,
              fontFamily: "var(--font-dm-sans)",
            }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{
              fill: "var(--text-tertiary)",
              fontSize: 10,
              fontFamily: "var(--font-jb-mono)",
            }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={40}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={strokeColor}
            strokeWidth={1.75}
            fillOpacity={1}
            fill="url(#equityGradient)"
            isAnimationActive
            animationDuration={500}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
