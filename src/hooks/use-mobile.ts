"use client";

import * as React from "react";
import { MOBILE_BREAKPOINT_PX } from "@/lib/constants/app";

export function useIsMobile(): boolean {
  // Initialize from window if available to avoid hydration mismatch.
  // SSR returns false (desktop-first); client corrects on first paint.
  const [isMobile, setIsMobile] = React.useState<boolean>(
    typeof window !== "undefined"
      ? window.innerWidth < MOBILE_BREAKPOINT_PX
      : false,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    mql.addEventListener("change", onChange, { passive: true });
    // Sync immediately in case the initial useState ran on the server
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
