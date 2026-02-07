"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  BarChart3,
  Calendar,
  CalendarDays,
  Shield,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileText,
  PieChart,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";

const mainNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "Trades",
    href: "/trades",
    icon: TrendingUp,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Playbooks",
    href: "/playbooks",
    icon: BookOpen,
  },
  {
    title: "Weekly Analysis",
    href: "/weekly",
    icon: Calendar,
  },
  {
    title: "Journal",
    href: "/journal",
    icon: FileText,
  },
];

const secondaryNavItems = [
  {
    title: "Prop Firm",
    href: "/prop-firm",
    icon: Shield,
  },
  {
    title: "Reports",
    href: "/reports",
    icon: PieChart,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "nav-sidebar relative flex h-screen flex-col transition-all duration-300",
          collapsed ? "w-[68px]" : "w-[260px]",
          className,
        )}
      >
        {/* Logo Area */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-[var(--space-border)]">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#818cf8] to-[#a78bfa] shadow-lg shadow-[#818cf8]/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-gradient">
                  Nova Trading
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Journal
                </span>
              </div>
            </Link>
          )}
          {collapsed && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#818cf8] to-[#a78bfa] mx-auto shadow-lg shadow-[#818cf8]/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Quick Add Button */}
        <div className="p-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={cn(
                  "btn-primary w-full rounded-xl h-11",
                  collapsed ? "px-2" : "px-4",
                )}
              >
                <Plus className="h-4 w-4" />
                {!collapsed && <span className="ml-2">Log Trade</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Log Trade</TooltipContent>
            )}
          </Tooltip>
        </div>

        <Separator className="opacity-50" />

        {/* Main Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <div className={cn("mb-2 px-3", collapsed && "text-center")}>
            {!collapsed && (
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Main Menu
              </span>
            )}
          </div>
          <nav className="flex flex-col gap-1">
            {mainNavItems.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn("nav-item", isActive && "active")}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">{item.title}</TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>

          <Separator className="my-4 opacity-50" />

          <div className={cn("mb-2 px-3", collapsed && "text-center")}>
            {!collapsed && (
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tools
              </span>
            )}
          </div>
          <nav className="flex flex-col gap-1">
            {secondaryNavItems.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn("nav-item", isActive && "active")}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">{item.title}</TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="border-t border-[var(--space-border)] p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-muted-foreground hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
