"use client";

import {
  Download,
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
} from "lucide-react";
import {
  AppPageHeader,
  AppPanel,
  PanelTitle,
  SectionHeader,
} from "@/components/ui/page-primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { REPORT_TYPE_COLORS } from "@/lib/data/dummy";

const reports = [
  {
    id: "1",
    title: "Monthly Performance Report",
    description: "Comprehensive breakdown of your monthly trading performance",
    icon: BarChart3,
    type: "Performance",
  },
  {
    id: "2",
    title: "Playbook Analysis",
    description:
      "Detailed analysis of each trading strategy by win rate and R-multiple",
    icon: PieChart,
    type: "Strategy",
  },
  {
    id: "3",
    title: "Risk Management Report",
    description:
      "Review your risk metrics, drawdown history, and consistency score",
    icon: TrendingUp,
    type: "Risk",
  },
  {
    id: "4",
    title: "Tax Report",
    description: "Trade summary for tax filing purposes",
    icon: FileText,
    type: "Tax",
  },
];

export default function ReportsPage() {
  return (
    <div className="page-root page-sections">
      <AppPageHeader
        eyebrow="Analytics"
        title="Reports"
        description="Generate and download detailed reports of your trading activity."
        icon={<FileText size={18} strokeWidth={1.8} color="#fff" />}
      />

      <SectionHeader eyebrow="Available Reports" title="Export & Download" />

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon;
          const accentColor =
            REPORT_TYPE_COLORS[report.type] ?? "var(--accent-primary)";
          return (
            <AppPanel key={report.id}>
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] shrink-0"
                  style={{
                    background: `${accentColor}18`,
                    border: `1px solid ${accentColor}30`,
                  }}
                >
                  <Icon size={18} style={{ color: accentColor }} />
                </div>
                <div>
                  <PanelTitle
                    title={report.title}
                    subtitle={report.description}
                    className="mb-0"
                  />
                  <Badge
                    className="mt-2"
                    style={{
                      background: `${accentColor}15`,
                      color: accentColor,
                      border: "none",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {report.type}
                  </Badge>
                </div>
              </div>

              <Button variant="outline" disabled className="w-full opacity-50">
                <Download size={13} />
                Coming Soon
              </Button>
            </AppPanel>
          );
        })}
      </div>
    </div>
  );
}
