"use client";

import { useEffect, useRef } from "react";
import { AUTOSAVE_DEBOUNCE_MS } from "@/lib/constants/app";

/**
 * Debounces an auto-save function.
 *
 * Calls `fn` after `delay` ms of inactivity in `value`.
 * Uses a ref for `fn` to avoid stale closures — always calls the latest version.
 *
 * @example
 * useAutoSave(notes, (v) => updateTrade(id, { notes: v }));
 */
export function useAutoSave<T>(
  value: T,
  fn: (value: T) => Promise<void> | void,
  delay: number = AUTOSAVE_DEBOUNCE_MS,
): void {
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fnRef.current(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
}
