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
 *
 * SSR-SAFE: sidebarCollapsed always starts as `false` on both server and client.
 * After hydration completes, a useEffect reads localStorage and applies the
 * saved preference — this prevents the server/client HTML mismatch that caused
 * the hydration warning.
 */
export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Always start as false (matches server render). localStorage sync happens
  // in useEffect after hydration — this is the standard SSR-safe pattern.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync from localStorage once after mount
  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true") {
        setSidebarCollapsed(true);
      }
    } catch {
      // localStorage unavailable — keep default (expanded)
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

  const contentPadding = sidebarCollapsed ? "md:pl-[64px]" : "md:pl-[240px]";

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
