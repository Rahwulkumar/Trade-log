"use client";

import { useState, useLayoutEffect } from "react";

export function StarfieldBackground() {
  const [mounted, setMounted] = useState(false);

  // useLayoutEffect runs synchronously after DOM mutations
  // This is the correct pattern for hydration checks
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard hydration pattern
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <div className="space-mesh" aria-hidden="true" />;
}
