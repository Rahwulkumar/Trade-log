"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LogOut, Menu, Moon, Settings, Sun } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { useTheme } from "@/components/theme-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
    <Button
      onClick={toggle}
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0 rounded-[var(--radius-default)] p-0 text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
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
    </Button>
  );
}

interface DashboardHeaderProps {
  onMobileMenuClick?: () => void;
}

export function DashboardHeader({ onMobileMenuClick }: DashboardHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { selectedAccountId, setSelectedAccountId, propAccounts, loading } =
    usePropAccount();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const title =
    Object.entries(PAGE_TITLES).find(
      ([key]) => pathname === key || (key !== "/" && pathname.startsWith(key)),
    )?.[1] ?? "TradeLog";

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "TL";

  const selectedAccountLabel = (() => {
    if (!selectedAccountId) return "All Accounts";
    if (selectedAccountId === "unassigned") return "Unassigned";
    const account = propAccounts.find((item) => item.id === selectedAccountId);
    return account?.accountName ?? "All Accounts";
  })();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/auth/login");
      router.refresh();
    } catch {
      router.replace("/auth/clear-session");
    }
  };

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
      <Button
        variant="ghost"
        size="icon"
        className="flex h-9 w-9 shrink-0 rounded-[var(--radius-default)] p-0 text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] md:hidden"
        onClick={onMobileMenuClick}
        aria-label="Open navigation"
      >
        <Menu size={19} strokeWidth={1.8} />
      </Button>

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
      {!loading ? (
        propAccounts.length > 0 ? (
          <Select
            value={selectedAccountId || "all"}
            onValueChange={(value) =>
              setSelectedAccountId(value === "all" ? null : value)
            }
          >
            <SelectTrigger
              className="hidden h-9 min-w-[168px] gap-2 rounded-[var(--radius-default)] border px-2 text-xs shadow-none sm:flex"
              aria-label="Select account"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              <Building2
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: "var(--text-tertiary)" }}
              />
              <span className="max-w-[120px] truncate">
                {selectedAccountLabel}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {propAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.accountName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Button
            asChild
            variant="outline"
            className="hidden h-9 gap-1.5 rounded-[var(--radius-default)] border px-3 text-xs shadow-none sm:inline-flex"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border-default)",
            }}
          >
            <Link href="/prop-firm">
              <Building2
                className="h-3.5 w-3.5"
                style={{ color: "var(--text-tertiary)" }}
              />
              Add Account
            </Link>
          </Button>
        )
      ) : null}

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-auto shrink-0 gap-2 rounded-[var(--radius-default)] px-2 py-1.5 hover:bg-[var(--surface-elevated)] sm:gap-2.5 sm:px-3",
            )}
            style={{ border: "1px solid var(--border-default)" }}
            aria-label="Open profile menu"
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
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="space-y-1">
            <p className="text-sm font-medium">
              {user?.email ? user.email.split("@")[0] : "Trader"}
            </p>
            <p className="text-xs font-normal text-muted-foreground">
              {user?.email ?? "No account email"}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              void handleSignOut();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
