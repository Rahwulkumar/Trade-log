"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Plus,
  Sun,
  Moon,
  Hexagon,
  Building2,
  Settings,
  Briefcase,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Calendar", href: "/calendar" },
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
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Get display name for selected account
  const getAccountDisplayName = () => {
    if (!selectedAccountId || selectedAccountId === "all")
      return "All Accounts";
    if (selectedAccountId === "unassigned") return "Unassigned";
    const account = propAccounts.find((a) => a.id === selectedAccountId);
    return account?.name || "All Accounts";
  };

  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className={cn(
          "pointer-events-auto flex items-center gap-2 p-1.5 rounded-full transition-all duration-300",
          "bg-white/60 dark:bg-black/40 backdrop-blur-2xl",
          "border border-white/20 dark:border-white/10",
          "shadow-[0_8px_32px_0_rgba(0,0,0,0.05)]",
          isScrolled ? "scale-90" : "scale-100",
        )}
      >
        {/* Animated Gradient Border Effect - Monochrome */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 via-gray-200/20 to-white/20 opacity-0 hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />

        {/* Logo Section */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 pl-4 pr-2 py-2 group relative"
        >
          <div className="relative flex items-center justify-center">
            {/* Spinning/Glowing Hexagon - Monochrome */}
            <div className="absolute inset-0 bg-white blur-lg opacity-20 group-hover:opacity-60 transition-opacity duration-500" />
            <Hexagon
              className="w-5 h-5 text-gray-900 dark:text-white group-hover:rotate-180 transition-transform duration-700 ease-out"
              strokeWidth={2}
            />
          </div>
          <span className="text-sm font-bold tracking-wide text-gray-900 dark:text-white hidden sm:block">
            TradeLog
          </span>
        </Link>

        {/* Divider */}
        <div className="w-px h-4 bg-gradient-to-b from-transparent via-gray-300 dark:via-white/20 to-transparent mx-1 hidden lg:block" />

        {/* Main Navigation - Minimalist Text */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-300 group overflow-hidden",
                  isActive
                    ? "text-gray-900 dark:text-white font-semibold"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
                )}
              >
                {/* Hover shine effect */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />

                {/* Active Dot - Monochrome */}
                {isActive && (
                  <motion.div
                    layoutId="activeDot"
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-900 dark:bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-gradient-to-b from-transparent via-gray-300 dark:via-white/20 to-transparent mx-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-2 pr-1">
          {/* Account Selector - Hollow/Glass */}
          {propAccounts.length > 0 && !loading && (
            <Select
              value={selectedAccountId || "all"}
              onValueChange={(v) =>
                setSelectedAccountId(v === "all" ? null : v)
              }
            >
              <SelectTrigger className="h-8 border border-gray-200/50 dark:border-white/5 bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 focus:ring-0 gap-2 px-3 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors">
                <Building2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline-block max-w-[100px] truncate">
                  {getAccountDisplayName()}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {propAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Secondary Nav Icons - purely hover based */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/prop-firm"
              className="group relative p-2 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Prop Firm"
            >
              <Briefcase className="w-4 h-4" />
              <div className="absolute inset-0 bg-gray-500/10 rounded-full scale-0 group-hover:scale-100 transition-transform" />
            </Link>
            <Link
              href="/settings"
              className="group relative p-2 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
              <div className="absolute inset-0 bg-gray-500/10 rounded-full scale-0 group-hover:scale-100 transition-transform" />
            </Link>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="group relative p-2 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            <div className="absolute inset-0 bg-gray-500/10 rounded-full scale-0 group-hover:scale-100 transition-transform" />
          </button>

          {/* Log Trade - THE INNOVATIVE OUTLINE BUTTON (MONOCHROME) */}
          <Link
            href="/trades?new=true"
            className="group relative flex items-center gap-1.5 pl-3 pr-4 py-1.5 ml-1 overflow-hidden rounded-full"
          >
            {/* Animated Gradient Border Container - Monochrome */}
            <div className="absolute inset-0 p-[1px] rounded-full bg-gradient-to-r from-gray-300 via-white to-gray-300 dark:from-white/20 dark:via-white dark:to-white/20 bg-[length:200%_100%] animate-shimmer" />

            {/* Inner Background */}
            <div className="absolute inset-[1px] rounded-full bg-white/90 dark:bg-black/90 z-0" />

            {/* Glow Effect on Hover - Cold White */}
            <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />

            {/* Content */}
            <Plus
              className="w-3.5 h-3.5 text-gray-900 dark:text-white relative z-10 group-hover:rotate-90 transition-transform duration-300"
              strokeWidth={3}
            />
            <span className="text-xs font-bold tracking-wide text-gray-900 dark:text-white relative z-10 uppercase">
              LOG CHECK
            </span>
          </Link>
        </div>
      </motion.nav>
    </div>
  );
}
