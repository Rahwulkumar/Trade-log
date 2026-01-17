"use client";

import { useEffect, useState } from "react";

export function StarfieldBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-mesh" aria-hidden="true" />
  );
}

