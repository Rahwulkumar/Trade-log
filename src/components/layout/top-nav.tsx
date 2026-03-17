"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Building2, Moon, Plus, Settings, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Trades", href: "/trades" },
  { label: "Analytics", href: "/analytics" },
  { label: "Playbooks", href: "/playbooks" },
  { label: "Strategies", href: "/strategies" },
  { label: "Journal", href: "/journal" },
];

export function TopNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { selectedAccountId, setSelectedAccountId, propAccounts, loading } =
    usePropAccount();

  if (pathname.startsWith("/auth")) {
    return null;
  }

  const getAccountDisplayName = () => {
    if (!selectedAccountId || selectedAccountId === "all")
      return "All Accounts";
    if (selectedAccountId === "unassigned") return "Unassigned";
    const account = propAccounts.find((a) => a.id === selectedAccountId);
    return account?.accountName || "All Accounts";
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:px-6">
        <Link href="/dashboard" className="shrink-0">
          <span className="text-sm font-semibold tracking-tight">TradeLog</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isActive(item.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!loading && (
            propAccounts.length > 0 ? (
              <Select
                value={selectedAccountId || "all"}
                onValueChange={(value) =>
                  setSelectedAccountId(value === "all" ? null : value)
                }
              >
                <SelectTrigger className="h-9 min-w-[140px] gap-2 rounded-md border-border bg-card px-2 text-xs" aria-label="Select account">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="max-w-[110px] truncate">
                    {getAccountDisplayName()}
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
                className="h-9 gap-1.5 border-border bg-card px-3 text-xs shadow-none"
              >
                <Link href="/prop-firm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Add account
                </Link>
              </Button>
            )
          )}

          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-9 w-9 border-border bg-card text-muted-foreground shadow-none"
          >
            <Link href="/prop-firm" aria-label="Manage prop accounts">
              <Briefcase className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-9 w-9 border-border bg-card text-muted-foreground shadow-none"
          >
            <Link href="/settings" aria-label="Open settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 border-border bg-card text-muted-foreground shadow-none"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <Button asChild className="h-9 gap-1 px-3 text-xs">
            <Link href="/trades?new=true">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Log Trade</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
