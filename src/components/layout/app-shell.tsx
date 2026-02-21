"use client";

import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { DashboardHeader } from "@/components/layout/dashboard-header";

interface AppShellProps {
  children: React.ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

/**
 * AppShell — holds mobile sidebar open state + desktop collapse state.
 *
 * Layout:
 *   mobile  (<md): sidebar hidden, full-width content, hamburger in header
 *   desktop (≥md): fixed sidebar (240px expanded / 60px collapsed), content offset
 */
export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Restore collapsed state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "true") setSidebarCollapsed(true);
    } catch {
      // localStorage unavailable (SSR / private browsing) — ignore
    }
  }, []);

  const toggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const contentPadding = sidebarCollapsed ? "md:pl-[60px]" : "md:pl-[240px]";

  return (
    <div className="relative min-h-screen bg-background">
      {/* Sidebar — desktop always visible, mobile as drawer */}
      <SidebarNav
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main area — offset by sidebar on desktop */}
      <div
        className={`flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out ${contentPadding}`}
      >
        {/* Sticky top header */}
        <DashboardHeader onMobileMenuClick={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
