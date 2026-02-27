"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Camera, Upload, ZoomIn, X, Clock } from "lucide-react";
import type { TradeScreenshot } from "@/lib/supabase/types";

export type Timeframe = "4H" | "1H" | "15M" | "Execution" | "1m" | "5m";

// Local display-only type (doesn't need to match DB exactly)
interface ScreenshotItem {
  url: string;
  timeframe: string;
  timestamp?: string; // display only — mapped from created_at
}

const ALL_TIMEFRAMES: Timeframe[] = ["4H", "1H", "15M", "Execution"];

interface ScreenshotGalleryProps {
  screenshots: TradeScreenshot[];
  onUpload: (timeframe: Timeframe) => void;
  onViewFullscreen: (url: string) => void;
  onDelete?: (index: number) => void;
  timeframesFilter?: Timeframe[];
  className?: string;
}

function parseScreenshot(s: TradeScreenshot): ScreenshotItem {
  return {
    url: s.url,
    timeframe: s.timeframe ?? "Execution",
    timestamp: s.created_at,
  };
}

function ScreenshotCard({
  ss,
  onView,
  onDelete,
}: {
  ss: ScreenshotItem;
  onView: () => void;
  onDelete?: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="relative rounded-[8px] overflow-hidden group"
      style={{
        aspectRatio: "16/9",
        background: "var(--surface-elevated)",
        border: "1px solid var(--border-subtle)",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Image
        src={ss.url}
        alt={`${ss.timeframe} screenshot`}
        fill
        className="object-cover transition-transform duration-300"
        style={{ transform: hover ? "scale(1.03)" : "scale(1)" }}
        unoptimized
      />

      {/* Overlay */}
      <div
        className="absolute inset-0 flex flex-col justify-between p-2 transition-opacity duration-200"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.7) 100%)",
          opacity: hover ? 1 : 0,
        }}
      >
        <div className="flex justify-between">
          <span
            className="rounded-full px-2 py-0.5 font-bold"
            style={{
              fontSize: "0.58rem",
              background: "rgba(0,0,0,0.6)",
              color: "#2CC299",
              border: "1px solid rgba(44,194,153,0.4)",
            }}
          >
            {ss.timeframe}
          </span>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full"
              style={{ background: "rgba(224,82,82,0.7)", color: "#fff" }}
            >
              <X size={9} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          {ss.timestamp && (
            <span
              className="flex items-center gap-1"
              style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.6)" }}
            >
              <Clock size={9} />
              {new Date(ss.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            type="button"
            onClick={onView}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
            style={{
              background: "rgba(44,194,153,0.8)",
              color: "#051F20",
              fontSize: "0.62rem",
            }}
          >
            <ZoomIn size={10} />
            View
          </button>
        </div>
      </div>

      {/* Always-visible TF badge */}
      <div
        className="absolute top-2 left-2 rounded-full px-2 py-0.5 font-bold"
        style={{
          fontSize: "0.58rem",
          background: "rgba(5,31,32,0.8)",
          color: "#2CC299",
          border: "1px solid rgba(44,194,153,0.3)",
          opacity: hover ? 0 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {ss.timeframe}
      </div>
    </div>
  );
}

function UploadSlot({
  timeframe,
  onUpload,
}: {
  timeframe: Timeframe;
  onUpload: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onUpload}
      className="relative rounded-[8px] flex flex-col items-center justify-center gap-2 transition-all duration-150 group"
      style={{
        aspectRatio: "16/9",
        background: "var(--surface-elevated)",
        border: "1px dashed var(--border-default)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(44,194,153,0.4)";
        e.currentTarget.style.background = "rgba(44,194,153,0.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-default)";
        e.currentTarget.style.background = "var(--surface-elevated)";
      }}
    >
      <Camera
        size={18}
        style={{ color: "var(--text-tertiary)", opacity: 0.5 }}
      />
      <div className="text-center">
        <p
          style={{
            fontSize: "0.68rem",
            color: "var(--text-tertiary)",
            fontWeight: 600,
          }}
        >
          {timeframe}
        </p>
        <p
          style={{
            fontSize: "0.6rem",
            color: "var(--text-tertiary)",
            opacity: 0.6,
          }}
        >
          Click to upload
        </p>
      </div>
    </button>
  );
}

export function ScreenshotGallery({
  screenshots = [],
  onUpload,
  onViewFullscreen,
  onDelete,
  timeframesFilter,
}: ScreenshotGalleryProps) {
  const availableTimeframes = timeframesFilter ?? ALL_TIMEFRAMES;

  // Group screenshots by timeframe
  const grouped = useMemo(() => {
    const map: Record<string, ScreenshotItem[]> = {};
    availableTimeframes.forEach((tf) => (map[tf] = []));
    screenshots.forEach((s) => {
      const parsed = parseScreenshot(s);
      const tf = parsed.timeframe as Timeframe;
      if (availableTimeframes.includes(tf)) {
        map[tf] = [...(map[tf] ?? []), parsed];
      } else {
        // Put unrecognised timeframes into first bucket
        map[availableTimeframes[0]] = [
          ...(map[availableTimeframes[0]] ?? []),
          parsed,
        ];
      }
    });
    return map;
  }, [screenshots, availableTimeframes]);

  const totalScreenshots = screenshots.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}>
          {totalScreenshots === 0
            ? "No screenshots yet"
            : `${totalScreenshots} screenshot${totalScreenshots !== 1 ? "s" : ""}`}
        </span>
        {/* Quick-upload for each timeframe */}
        <div className="flex items-center gap-1.5">
          {availableTimeframes.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onUpload(tf)}
              className="flex items-center gap-1 rounded-[6px] px-2 py-1 font-semibold transition-all"
              style={{
                fontSize: "0.65rem",
                background: "var(--surface-elevated)",
                color: "var(--accent-primary)",
                border: "1px solid var(--border-subtle)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "rgba(44,194,153,0.4)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--border-subtle)")
              }
            >
              <Upload size={9} strokeWidth={2} />
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Grid per timeframe */}
      {availableTimeframes.map((tf) => {
        const items = grouped[tf] ?? [];
        return (
          <div key={tf} className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontSize: "0.6rem",
                  color: "var(--text-tertiary)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                {tf}
              </span>
              <div
                className="h-px flex-1"
                style={{ background: "var(--border-subtle)" }}
              />
              {items.length > 0 && (
                <span
                  style={{
                    fontSize: "0.58rem",
                    color: "var(--accent-primary)",
                  }}
                >
                  {items.length}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {items.map((ss, i) => (
                <ScreenshotCard
                  key={i}
                  ss={ss}
                  onView={() => onViewFullscreen(ss.url)}
                  onDelete={onDelete ? () => onDelete(i) : undefined}
                />
              ))}
              {/* Upload slot */}
              <UploadSlot timeframe={tf} onUpload={() => onUpload(tf)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
