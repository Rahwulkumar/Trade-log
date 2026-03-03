// ─── Fullscreen Image Overlay ───────────────────────────────────────────────
// Press Escape or click outside to close. Used by TradeJournal for screenshot zoom.
// Extracted from journal-client.tsx during Phase 3 decomposition.
// ────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export function FullscreenImage({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.88)" }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Screenshot"
        className="max-w-[90vw] max-h-[90vh] rounded-[10px] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full p-2"
        style={{
          background: "rgba(255,255,255,0.12)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-default)",
        }}
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}
