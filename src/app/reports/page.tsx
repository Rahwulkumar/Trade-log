import {
  type LucideIcon,
  Download,
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
} from "lucide-react";
import {
  AppMetricCard,
  AppPageHeader,
  SectionHeader,
} from "@/components/ui/page-primitives";
import { Button } from "@/components/ui/button";
import { InsetPanel } from "@/components/ui/surface-primitives";
import { ReportCatalogCard } from "@/components/ui/report-primitives";

type ReportTone = "performance" | "strategy" | "risk";

interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: string;
  tone: ReportTone;
  details: Array<{
    label: string;
    value: string;
    tone?: "default" | "profit" | "loss" | "warning" | "accent";
    sub?: string;
  }>;
}

const reports: ReportDefinition[] = [
  {
    id: "1",
    title: "Monthly Performance Report",
    description: "Comprehensive breakdown of your monthly trading performance",
    icon: BarChart3,
    category: "Performance",
    tone: "performance",
    details: [
      { label: "Format", value: "PDF / CSV" },
      { label: "Scope", value: "Account + Date" },
      { label: "Status", value: "Planned", tone: "warning" },
    ],
  },
  {
    id: "2",
    title: "Playbook Analysis",
    description:
      "Detailed analysis of each trading strategy by win rate and R-multiple",
    icon: PieChart,
    category: "Strategy",
    tone: "strategy",
    details: [
      { label: "Format", value: "PDF / CSV" },
      { label: "Scope", value: "Playbook Library" },
      { label: "Status", value: "Planned", tone: "warning" },
    ],
  },
  {
    id: "3",
    title: "Risk Management Report",
    description:
      "Review your risk metrics, drawdown history, and consistency score",
    icon: TrendingUp,
    category: "Risk",
    tone: "risk",
    details: [
      { label: "Format", value: "PDF" },
      { label: "Scope", value: "Risk + Compliance" },
      { label: "Status", value: "Planned", tone: "warning" },
    ],
  },
];

export default function ReportsPage() {
  const summaryCards = [
    {
      label: "Report Templates",
      value: String(reports.length),
      tone: "default" as const,
    },
    {
      label: "Export Formats",
      value: "2",
      helper: "PDF / CSV",
      tone: "accent" as const,
    },
    {
      label: "Live Downloads",
      value: "0",
      tone: "warning" as const,
    },
    {
      label: "Status",
      value: "Planned",
      helper: "Wiring live exports",
      tone: "warning" as const,
      monoValue: false,
    },
  ];

  return (
    <>
      <AppPageHeader
        eyebrow="Analytics"
        title="Reports"
        description="Generate and download detailed reports of your trading activity."
        icon={
          <FileText
            size={18}
            strokeWidth={1.8}
            style={{ color: "var(--text-inverse)" }}
          />
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <AppMetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            helper={card.helper}
            tone={card.tone}
            monoValue={card.monoValue}
          />
        ))}
      </section>

      <InsetPanel tone="warning" paddingClassName="px-4 py-3">
        <p className="text-label" style={{ color: "var(--warning-primary)" }}>
          Export Pipeline
        </p>
        <p
          className="mt-1 text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          The report catalog now uses the shared app shell and card system. File
          generation and download endpoints are still being wired before these
          exports go live.
        </p>
      </InsetPanel>

      <SectionHeader
        eyebrow="Available Reports"
        title="Export & Download"
        subtitle="Report templates now use the same panel, metric, and action language as the rest of the product."
      />

      <section className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <ReportCatalogCard
              key={report.id}
              icon={<Icon size={18} />}
              title={report.title}
              description={report.description}
              category={report.category}
              tone={report.tone}
              details={report.details}
              action={
                <Button variant="outline" disabled className="w-full">
                  <Download size={13} />
                  Coming Soon
                </Button>
              }
            />
          );
        })}
      </section>
    </>
  );
}
