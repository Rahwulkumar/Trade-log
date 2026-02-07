"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileText,
  Save,
  Target,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Mock economic events
const economicEvents = [
  { id: "1", date: "2024-12-16", time: "09:30", event: "UK Manufacturing PMI", currency: "GBP", impact: "medium", actual: "51.2", forecast: "50.8" },
  { id: "2", date: "2024-12-16", time: "14:45", event: "US Flash Manufacturing PMI", currency: "USD", impact: "high", actual: "49.4", forecast: "49.8" },
  { id: "3", date: "2024-12-18", time: "19:00", event: "FOMC Rate Decision", currency: "USD", impact: "high", actual: "4.50%", forecast: "4.50%" },
  { id: "4", date: "2024-12-18", time: "19:30", event: "FOMC Press Conference", currency: "USD", impact: "high" },
  { id: "5", date: "2024-12-19", time: "12:00", event: "BOE Rate Decision", currency: "GBP", impact: "high", actual: "4.75%", forecast: "4.75%" },
  { id: "6", date: "2024-12-20", time: "13:30", event: "US Core PCE", currency: "USD", impact: "high", actual: "0.2%", forecast: "0.2%" },
];

// Mock weekly performance data
const weeklyPerformance = {
  trades: 12,
  winners: 8,
  losers: 4,
  winRate: 66.7,
  netPnL: 2847,
  avgR: 1.6,
  bestTrade: { symbol: "EUR/USD", pnl: 823 },
  worstTrade: { symbol: "XAU/USD", pnl: -234 },
  byAsset: [
    { asset: "Forex", trades: 7, pnl: 1523, winRate: 71.4 },
    { asset: "Futures", trades: 3, pnl: 892, winRate: 66.7 },
    { asset: "Gold", trades: 2, pnl: 432, winRate: 50.0 },
  ],
};

export default function WeeklyAnalysisPage() {
  const [currentWeek, setCurrentWeek] = useState("Dec 16-20, 2024");
  const [weeklyPlan, setWeeklyPlan] = useState(
    "- Focus on FOMC reaction trades\n- Avoid trading during actual FOMC announcement\n- Look for USD strength on hawkish Fed\n- Monitor GBP for BOE decision impact"
  );
  const [weeklyReview, setWeeklyReview] = useState(
    "- FOMC played out as expected, caught good USD longs\n- Gold shorts worked well post-FOMC\n- Overtraded on Friday before PCE - lesson learned"
  );
  const [lessonsLearned, setLessonsLearned] = useState(
    "1. Sit on hands during high-impact news\n2. My H4 setups outperforming H1 this week\n3. Need to trail stops better on winners"
  );

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-500 text-white";
      case "medium":
        return "bg-yellow-500 text-black";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-semibold">{currentWeek}</span>
          </div>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button className="bg-gradient-to-r from-[#7c8bb8] to-[#a69878] hover:from-[#5d6a94] hover:to-teal-700">
          <Save className="h-4 w-4 mr-2" />
          Save Analysis
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Economic Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[#7c8bb8]" />
                <CardTitle>Economic Calendar - This Week</CardTitle>
              </div>
              <CardDescription>Key economic events and their impact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {economicEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[80px]">
                        <div className="text-sm font-medium">{event.date.split("-")[2]} Dec</div>
                        <div className="text-xs text-muted-foreground">{event.time}</div>
                      </div>
                      <Badge className={cn("text-xs", getImpactColor(event.impact))}>
                        {event.impact}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">{event.event}</div>
                        <div className="text-xs text-muted-foreground">{event.currency}</div>
                      </div>
                    </div>
                    {event.actual && (
                      <div className="text-right">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Actual: </span>
                          <span className="font-medium">{event.actual}</span>
                        </div>
                        {event.forecast && (
                          <div className="text-xs text-muted-foreground">
                            Forecast: {event.forecast}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Notes */}
          <div className="grid gap-6 md:grid-cols-1">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#7c8bb8]" />
                  <CardTitle>Pre-Week Plan</CardTitle>
                </div>
                <CardDescription>Your trading plan for this week</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={weeklyPlan}
                  onChange={(e) => setWeeklyPlan(e.target.value)}
                  rows={5}
                  className="resize-none"
                  placeholder="What&apos;s your plan for this week?"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#7c8bb8]" />
                  <CardTitle>Weekly Review</CardTitle>
                </div>
                <CardDescription>Post-week reflection and analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={weeklyReview}
                  onChange={(e) => setWeeklyReview(e.target.value)}
                  rows={5}
                  className="resize-none"
                  placeholder="How did the week go?"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lessons Learned</CardTitle>
                <CardDescription>Key takeaways for improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  rows={4}
                  className="resize-none"
                  placeholder="What did you learn this week?"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar - Performance Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Performance</CardTitle>
              <CardDescription>Summary of this week's trading</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Main Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{weeklyPerformance.trades}</div>
                  <div className="text-xs text-muted-foreground">Total Trades</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{weeklyPerformance.winRate}%</div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
              </div>

              {/* P&L */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-[#7c8bb8]/10 to-[#c9b89a]/10 border border-[#7c8bb8]/20">
                <div className="text-center">
                  <div className={cn(
                    "text-3xl font-bold",
                    weeklyPerformance.netPnL >= 0 ? "text-[#7c8bb8]" : "text-red-500"
                  )}>
                    {weeklyPerformance.netPnL >= 0 ? "+" : ""}${weeklyPerformance.netPnL.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Net P&L</div>
                </div>
              </div>

              {/* Win/Loss */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#7c8bb8]" />
                  <span className="text-sm">Winners</span>
                </div>
                <span className="font-medium text-[#7c8bb8]">{weeklyPerformance.winners}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Losers</span>
                </div>
                <span className="font-medium text-red-500">{weeklyPerformance.losers}</span>
              </div>

              <Separator />

              {/* Best/Worst Trade */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Best Trade</span>
                  <span className="text-[#7c8bb8]">
                    {weeklyPerformance.bestTrade.symbol} (+${weeklyPerformance.bestTrade.pnl})
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Worst Trade</span>
                  <span className="text-red-500">
                    {weeklyPerformance.worstTrade.symbol} (${weeklyPerformance.worstTrade.pnl})
                  </span>
                </div>
              </div>

              <Separator />

              {/* By Asset */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">By Asset Class</h4>
                {weeklyPerformance.byAsset.map((item) => (
                  <div key={item.asset} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium">{item.asset}</span>
                      <span className="text-muted-foreground ml-2">({item.trades} trades)</span>
                    </div>
                    <span className={item.pnl >= 0 ? "text-[#7c8bb8]" : "text-red-500"}>
                      ${item.pnl}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



