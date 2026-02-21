import { PageShell } from "@/components/layout/page-shell";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageShell>{children}</PageShell>;
}
