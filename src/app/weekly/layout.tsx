import { PageShell } from "@/components/layout/page-shell";

export default function WeeklyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageShell>{children}</PageShell>;
}
