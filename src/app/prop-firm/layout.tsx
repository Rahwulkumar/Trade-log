import { PageShell } from "@/components/layout/page-shell";

export default function PropFirmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageShell>{children}</PageShell>;
}
