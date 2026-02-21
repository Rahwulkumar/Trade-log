"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const isPositive = changeType === "positive";
  const isNegative = changeType === "negative";

  const iconBg = isPositive
    ? "rgba(78,203,6,0.1)"
    : isNegative
      ? "rgba(255,68,85,0.1)"
      : undefined;

  const iconColor = isPositive
    ? "var(--profit-primary)"
    : isNegative
      ? "var(--loss-primary)"
      : undefined;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn("rounded-lg p-2", !iconBg && "bg-muted")}
          style={iconBg ? { background: iconBg } : undefined}
        >
          <Icon
            className="h-4 w-4"
            style={iconColor ? { color: iconColor } : { color: "var(--text-tertiary)" }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive ? (
              <ArrowUpRight className="h-4 w-4" style={{ color: "var(--profit-primary)" }} />
            ) : isNegative ? (
              <ArrowDownRight className="h-4 w-4" style={{ color: "var(--loss-primary)" }} />
            ) : null}
            <span
              className={cn("text-sm", !iconColor && "text-muted-foreground")}
              style={iconColor ? { color: iconColor } : undefined}
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
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background: isPositive
            ? "linear-gradient(to right, var(--profit-primary), rgba(78,203,6,0.3))"
            : isNegative
              ? "linear-gradient(to right, var(--loss-primary), rgba(255,68,85,0.3))"
              : "linear-gradient(to right, var(--text-tertiary), var(--border-default))",
        }}
      />
    </Card>
  );
}
