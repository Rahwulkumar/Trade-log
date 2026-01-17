"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Shield } from "lucide-react";

// Mock prop firm data
const propFirmData = {
  firmName: "FTMO",
  accountType: "Funded",
  accountBalance: 104523.80,
  initialBalance: 100000,
  dailyDrawdown: {
    current: 1.2,
    max: 5,
  },
  totalDrawdown: {
    current: 2.8,
    max: 10,
  },
  profitProgress: 4.52,
  tradingDays: 12,
  status: "compliant" as const,
};

export function PropFirmWidget() {
  const dailyDDPercent = (propFirmData.dailyDrawdown.current / propFirmData.dailyDrawdown.max) * 100;
  const totalDDPercent = (propFirmData.totalDrawdown.current / propFirmData.totalDrawdown.max) * 100;
  
  const getStatusColor = (percent: number) => {
    if (percent < 50) return "bg-[#7c8bb8]";
    if (percent < 75) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#7c8bb8]" />
            <CardTitle className="text-lg">Prop Firm Status</CardTitle>
          </div>
          <Badge variant="outline" className="border-[#7c8bb8] text-[#7c8bb8]">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Compliant
          </Badge>
        </div>
        <CardDescription>
          {propFirmData.firmName} • {propFirmData.accountType} Account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Balance */}
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">Account Balance</span>
          <span className="text-xl font-bold">
            ${propFirmData.accountBalance.toLocaleString()}
          </span>
        </div>

        {/* Daily Drawdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Daily Drawdown</span>
            <span>
              {propFirmData.dailyDrawdown.current}% / {propFirmData.dailyDrawdown.max}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={dailyDDPercent} 
              className="h-2 bg-muted"
            />
            <div 
              className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getStatusColor(dailyDDPercent)}`}
              style={{ width: `${dailyDDPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {(propFirmData.dailyDrawdown.max - propFirmData.dailyDrawdown.current).toFixed(1)}% remaining
          </p>
        </div>

        {/* Total Drawdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Drawdown</span>
            <span>
              {propFirmData.totalDrawdown.current}% / {propFirmData.totalDrawdown.max}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={totalDDPercent} 
              className="h-2 bg-muted"
            />
            <div 
              className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getStatusColor(totalDDPercent)}`}
              style={{ width: `${totalDDPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {(propFirmData.totalDrawdown.max - propFirmData.totalDrawdown.current).toFixed(1)}% remaining
          </p>
        </div>

        {/* Trading Days */}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-muted-foreground">Trading Days</span>
          <span className="font-medium">{propFirmData.tradingDays} days</span>
        </div>
      </CardContent>
    </Card>
  );
}



