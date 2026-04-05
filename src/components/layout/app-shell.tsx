"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { DashboardHeader } from "@/components/layout/dashboard-header";

interface AppShellProps {
  children: React.ReactNode;
  initialSidebarCollapsed?: boolean;
}

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";
const SIDEBAR_COLLAPSED_COOKIE = "sidebar-collapsed";

function persistSidebarCollapsed(next: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  } catch {
    // ignore localStorage failures
  }

  document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${String(next)}; path=/; max-age=31536000; samesite=lax`;
}

export function AppShell({
  children,
  initialSidebarCollapsed = false,
}: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    initialSidebarCollapsed,
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored == null) {
        persistSidebarCollapsed(initialSidebarCollapsed);
        return;
      }

      const next = stored === "true";
      if (next !== sidebarCollapsed) {
        setSidebarCollapsed(next);
      }
      persistSidebarCollapsed(next);
    } catch {
      document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${String(sidebarCollapsed)}; path=/; max-age=31536000; samesite=lax`;
    }
  // We only need a one-time reconciliation from persisted client storage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSidebarCollapsed]);

  // Auth pages render without sidebar/header
  if (pathname?.startsWith("/auth")) {
    return <>{children}</>;
  }

  const toggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      persistSidebarCollapsed(next);
      return next;
    });
  };

  const contentPadding = sidebarCollapsed ? "md:pl-[64px]" : "md:pl-[240px]";

  return (
    <div className="relative min-h-screen bg-background">
      <SidebarNav
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out ${contentPadding}`}
      >
        <DashboardHeader onMobileMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
