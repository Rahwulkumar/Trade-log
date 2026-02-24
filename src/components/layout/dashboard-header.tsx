"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sun, Moon } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { IconBell } from "@/components/ui/icons";

// Map routes to page titles
const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/analytics": "Analytics",
  "/playbooks": "Playbooks",
  "/strategies": "Strategies",
  "/journal": "Journal",
  "/reports": "Reports",
  "/weekly": "Weekly Review",
  "/prop-firm": "Prop Firm",
  "/settings": "Settings",
  "/profile": "Profile",
  "/notebook": "Trade Journal",
};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Resolve "system" to actual dark/light based on OS preference
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggle = () => setTheme(isDark ? "light" : "dark");

  return (
    <button
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-default)] transition-colors hover:bg-[var(--surface-elevated)] shrink-0"
      style={{ color: "var(--text-secondary)" }}
      title={
        mounted
          ? isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
          : "Toggle theme"
      }
    >
      {/* Render nothing until mounted to avoid SSR/CSR mismatch */}
      {mounted &&
        (isDark ? (
          <Sun size={16} strokeWidth={1.7} />
        ) : (
          <Moon size={16} strokeWidth={1.7} />
        ))}
    </button>
  );
}

interface DashboardHeaderProps {
  onMobileMenuClick?: () => void;
}

export function DashboardHeader({ onMobileMenuClick }: DashboardHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const title =
    Object.entries(PAGE_TITLES).find(
      ([key]) => pathname === key || (key !== "/" && pathname.startsWith(key)),
    )?.[1] ?? "CONIYEST";

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "TL";

  return (
    <header
      className="flex items-center gap-3 px-4 sm:px-6 shrink-0"
      style={{
        height: "64px",
        background: "var(--app-bg)",
        borderBottom: "1px solid var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 30,
        boxShadow: scrolled ? "var(--shadow-md)" : "none",
        transition: "box-shadow 200ms ease",
      }}
    >
      {/* Hamburger — mobile only */}
      <button
        className="flex md:hidden h-9 w-9 items-center justify-center rounded-[var(--radius-default)] transition-colors hover:bg-[var(--surface-elevated)] shrink-0"
        style={{ color: "var(--text-secondary)" }}
        onClick={onMobileMenuClick}
        aria-label="Open navigation"
      >
        <Menu size={19} strokeWidth={1.8} />
      </button>

      {/* Page title */}
      <h1
        className="flex-1"
        style={{
          fontWeight: 700,
          fontSize: "1.15rem",
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h1>

      {/* Right actions */}
      <ThemeToggle />

      {/* Notification bell */}
      <button
        className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-default)] transition-colors hover:bg-[var(--surface-elevated)] shrink-0"
        style={{ color: "var(--text-secondary)" }}
        title="Notifications"
      >
        <IconBell size={17} strokeWidth={1.7} />
        <span
          className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
          style={{ background: "var(--accent-primary)" }}
        />
      </button>

      {/* User avatar pill */}
      <Link
        href="/profile"
        className="flex items-center gap-2 sm:gap-2.5 rounded-[var(--radius-default)] px-2 sm:px-3 py-1.5 transition-colors hover:bg-[var(--surface-elevated)] shrink-0"
        style={{ border: "1px solid var(--border-default)" }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold"
          style={{ background: "var(--accent-primary)", color: "#04100a" }}
        >
          {userInitials}
        </div>
        <span
          className="hidden md:block text-[0.8rem] font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {user?.email ? user.email.split("@")[0] : "Trader"}
        </span>
      </Link>
    </header>
  );
}
