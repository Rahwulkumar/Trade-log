"use client";

import { useState, useEffect } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  TooltipProps
} from "recharts";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getEquityCurve, type EquityCurvePoint } from "@/lib/api/analytics";

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-[#1a1a1a] border border-white/10 p-3 shadow-xl">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold profit">
          ${payload[0].value?.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

interface EquityCurveProps {
  startingBalance?: number;
  propAccountId?: string | null;
}

export function EquityCurve({ startingBalance = 100000, propAccountId }: EquityCurveProps) {
  const { user, isConfigured } = useAuth();
  const [data, setData] = useState<{ date: string; balance: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEquityCurve() {
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }

      try {
        const curveData = await getEquityCurve(startingBalance, undefined, undefined, propAccountId);
        // Format dates for display
        const formattedData = curveData.map(point => ({
          date: new Date(point.date).toLocaleDateString("en-US", { 
            month: "short", 
            day: "numeric" 
          }),
          balance: point.balance,
        }));
        setData(formattedData);
      } catch (err) {
        console.error("Failed to load equity curve:", err);
      } finally {
        setLoading(false);
      }
    }

    loadEquityCurve();
  }, [user, isConfigured, startingBalance, propAccountId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length <= 1) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Log trades to see your equity curve</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#52525b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#52525b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#22c55e"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorBalance)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
