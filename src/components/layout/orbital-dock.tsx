"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  BarChart3,
  CalendarDays,
  Settings,
  Hexagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { id: "dashboard", icon: LayoutDashboard, href: "/dashboard", label: "CMD" },
  { id: "calendar", icon: CalendarDays, href: "/calendar", label: "CAL" },
  { id: "trades", icon: TrendingUp, href: "/trades", label: "TRD" },
  { id: "analytics", icon: BarChart3, href: "/analytics", label: "ANA" },
  { id: "notebook", icon: BookOpen, href: "/notebook", label: "LOG" },
  { id: "playbooks", icon: BookOpen, href: "/playbooks", label: "PLY" },
  { id: "settings", icon: Settings, href: "/settings", label: "SET" },
];

export function OrbitalDock() {
  const pathname = usePathname();

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="fixed left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-8 py-8"
    >
      {/* Decorative vertical line connecting the constellation */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent z-0" />

      {/* Brand Node */}
      <div className="relative z-10 group">
        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="w-10 h-10 rounded-full bg-void-surface border border-white/10 flex items-center justify-center backdrop-blur-md relative overflow-hidden">
          <Hexagon className="w-5 h-5 text-starlight-platinum animate-pulse" />
        </div>
      </div>

      {/* Navigation Nodes */}
      <nav className="flex flex-col gap-6 relative z-10">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              className="group relative flex items-center justify-center w-12 h-12"
            >
              {/* Hover Label (Holographic Tooltip) */}
              <div className="absolute left-full ml-4 px-3 py-1 bg-void-surface/80 border border-white/10 backdrop-blur-md rounded text-xs font-mono text-cyan-400 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap">
                {item.label}
                <span className="text-white/20 ml-2">::</span> {item.href}
              </div>

              {/* Icon Container */}
              <div
                className={cn(
                  "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                  isActive
                    ? "bg-white/10 text-cyan-400 scale-110 border border-cyan-500/30"
                    : "text-starlight-dim hover:text-white border border-transparent hover:border-white/5 bg-transparent hover:bg-white/5",
                )}
              >
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
              </div>

              {/* Active Indicator Dot */}
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute -right-2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Anchor */}
      <div className="w-1 h-8 bg-gradient-to-b from-white/10 to-transparent z-10" />
    </motion.div>
  );
}
