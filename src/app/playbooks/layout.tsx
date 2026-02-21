import { PageShell } from "@/components/layout/page-shell";

export default function PlaybooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageShell>{children}</PageShell>;
}
