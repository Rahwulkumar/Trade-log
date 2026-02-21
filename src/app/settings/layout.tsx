import { PageShell } from "@/components/layout/page-shell";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageShell>{children}</PageShell>;
}
