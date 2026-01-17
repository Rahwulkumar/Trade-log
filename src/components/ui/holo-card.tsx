"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface HoloCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  featured?: boolean; // For larger, more important cards
}

export function HoloCard({ children, className, delay = 0, featured = false }: HoloCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay, 
        ease: "easeOut" 
      }}
      className={cn(
        "holo-glass relative overflow-hidden group",
        featured ? "rounded-[32px] p-8" : "rounded-xl p-6",
        className
      )}
    >
      {/* 🚀 DECORATIVE ELEMENTS (HUD Style) */}
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/20 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/20 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/20 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/20 rounded-br-lg" />

      {/* Scanning Line Animation (On Hover) */}
      <div className="scanline" />
      
      {/* Background glow for depth */}
      <div className="absolute -inset-1 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg -z-10" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
