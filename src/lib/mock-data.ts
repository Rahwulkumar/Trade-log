import { DollarSign, Target, TrendingUp, BarChart3 } from "lucide-react";

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
