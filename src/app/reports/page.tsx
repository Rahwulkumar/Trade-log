"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, BarChart3, PieChart, TrendingUp } from "lucide-react";

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
    description: "Detailed analysis of each trading strategy",
    icon: PieChart,
    type: "Strategy",
  },
  {
    id: "3",
    title: "Risk Management Report",
    description: "Review your risk metrics and drawdown history",
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Available Reports</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#7c8bb8]/10">
                    <report.icon className="h-5 w-5 text-[#7c8bb8]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}



