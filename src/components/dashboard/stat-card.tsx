"use client";

import { TrendingUp, TrendingDown, DollarSign, Target, Percent, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  description?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "rounded-lg p-2",
          changeType === "positive" && "bg-[#7c8bb8]/10",
          changeType === "negative" && "bg-red-500/10",
          changeType === "neutral" && "bg-muted"
        )}>
          <Icon className={cn(
            "h-4 w-4",
            changeType === "positive" && "text-[#7c8bb8]",
            changeType === "negative" && "text-red-500",
            changeType === "neutral" && "text-muted-foreground"
          )} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center gap-1 mt-1">
            {changeType === "positive" ? (
              <ArrowUpRight className="h-4 w-4 text-[#7c8bb8]" />
            ) : changeType === "negative" ? (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            ) : null}
            <span
              className={cn(
                "text-sm",
                changeType === "positive" && "text-[#7c8bb8]",
                changeType === "negative" && "text-red-500",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </span>
            {description && (
              <span className="text-sm text-muted-foreground">
                {description}
              </span>
            )}
          </div>
        )}
      </CardContent>
      {/* Decorative gradient */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-1",
        changeType === "positive" && "bg-gradient-to-r from-[#7c8bb8] to-[#c9b89a]",
        changeType === "negative" && "bg-gradient-to-r from-red-500 to-orange-500",
        changeType === "neutral" && "bg-gradient-to-r from-gray-400 to-gray-500"
      )} />
    </Card>
  );
}

// Mock stats for dashboard
export const mockStats = [
  {
    title: "Net P&L",
    value: "+$4,523.80",
    change: "+12.3%",
    changeType: "positive" as const,
    icon: DollarSign,
    description: "vs last month",
  },
  {
    title: "Win Rate",
    value: "62.5%",
    change: "+2.1%",
    changeType: "positive" as const,
    icon: Target,
    description: "vs last month",
  },
  {
    title: "Avg R-Multiple",
    value: "1.8R",
    change: "+0.3R",
    changeType: "positive" as const,
    icon: TrendingUp,
    description: "vs last month",
  },
  {
    title: "Total Trades",
    value: "48",
    change: "-5",
    changeType: "negative" as const,
    icon: BarChart3,
    description: "vs last month",
  },
];



