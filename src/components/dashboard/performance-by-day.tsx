"use client";

import { useState, useEffect } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  TooltipProps
} from "recharts";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getPerformanceByDay, type DayPerformance } from "@/lib/api/analytics";

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const value = payload[0].value as number;
    const isPositive = value >= 0;
    return (
      <div className="rounded-lg bg-[#1a1a1a] border border-white/10 p-3 shadow-xl">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className={`text-lg font-semibold ${isPositive ? "profit" : "loss"}`}>
          {isPositive ? "+" : ""}${value?.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

interface PerformanceByDayProps {
  propAccountId?: string | null;
}

export function PerformanceByDay({ propAccountId }: PerformanceByDayProps) {
  const { user, isConfigured } = useAuth();
  const [data, setData] = useState<{ day: string; pnl: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }

      try {
        const dayData = await getPerformanceByDay(propAccountId);
        const formattedData = dayData.map(d => ({
          day: d.day.slice(0, 3), // Mon, Tue, etc.
          pnl: d.totalPnl,
        }));
        setData(formattedData);
      } catch (err) {
        console.error("Failed to load performance by day:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, isConfigured, propAccountId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0 || data.every(d => d.pnl === 0)) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        <p>Log trades to see daily performance</p>
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <XAxis
            dataKey="day"
            tick={{ fill: "#52525b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#52525b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
