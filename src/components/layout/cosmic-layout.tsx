"use client";

import { useEffect, useRef, useState } from "react";
import { OrbitalDock } from "./orbital-dock";
import { motion, useScroll, useTransform } from "framer-motion";

export function CosmicLayout({ children }: { children: React.ReactNode }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax mouse effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#020203] text-[#E2E8F0]">
      
      {/* 🌌 DEEP SPACE ATMOSPHERE (Fixed Backgrounds) */}
      
      {/* 1. Static Stars (Tiny Distance) */}
      <div 
        className="fixed inset-0 z-0 opacity-40"
        style={{ backgroundImage: 'radial-gradient(1px 1px at 50% 50%, white, transparent)' }} 
      />
      
      {/* 2. Moving Fog (Nebula) - Top Right */}
      <motion.div 
        className="fixed -top-[20%] -right-[10%] w-[800px] h-[800px] rounded-full bg-[#1e1b4b] opacity-20 blur-[120px] z-0 pointer-events-none"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15] 
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 3. Moving Fog (Nebula) - Bottom Left */}
      <motion.div 
        className="fixed -bottom-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-[#111827] opacity-30 blur-[100px] z-0 pointer-events-none"
        animate={{ 
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* 4. Interactive Dust Layers (Parallax) */}
      <motion.div 
        className="fixed inset-0 z-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        animate={{
          x: mousePosition.x * -20,
          y: mousePosition.y * -20,
        }}
        transition={{ type: "tween", ease: "linear", duration: 0 }}
      />

      {/* 🚀 NAVIGATION (Orbital Dock) */}
      <OrbitalDock />

      {/* 🛰️ MAIN CONTENT AREA */}
      {/* Pushed right to accommodate the floating dock, but without a hard border */}
      <div className="relative z-10 pl-32 pr-8 py-8 min-h-screen">
        {/* Subtle grid line for structure */}
        <div className="fixed left-24 top-0 bottom-0 w-px bg-white/5 z-0" />
        
        <main className="max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
