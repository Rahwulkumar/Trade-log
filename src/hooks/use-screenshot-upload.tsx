// ─── Screenshot Upload Hook ─────────────────────────────────────────────────
// Manages hidden file input for screenshot uploads to Supabase Storage.
// Extracted from journal-client.tsx during Phase 3 decomposition.
// ────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadTradeScreenshot } from "@/lib/api/storage";
import type { JournalScreenshot } from "@/domain/journal-types";

export function useScreenshotUpload(
  tradeId: string,
  userId: string | undefined,
  onUploaded: (ss: JournalScreenshot) => void,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingTf, setPendingTf] = useState<string>("Execution");

  const trigger = (timeframe: string) => {
    setPendingTf(timeframe);
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const path = await uploadTradeScreenshot(file, userId);
      const {
        data: { publicUrl },
      } = supabase.storage.from("trade-screenshots").getPublicUrl(path);
      const newScreenshot: JournalScreenshot = {
        id: `temp-${Date.now()}`,
        tradeId,
        url: publicUrl,
        timeframe: pendingTf,
        createdAt: new Date().toISOString(),
      };
      onUploaded(newScreenshot);
    } catch (err) {
      console.error("[Screenshot upload]", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const inputEl = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleFileChange}
    />
  );

  return { trigger, uploading, inputEl };
}
