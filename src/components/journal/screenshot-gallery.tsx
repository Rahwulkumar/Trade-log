"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { TradeScreenshot } from "@/lib/supabase/types";
import { ImageIcon, Upload, Clock } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Timeframe = "4H" | "1H" | "15M" | "Execution" | "1m" | "5m";

interface ScreenshotGalleryProps {
  screenshots: TradeScreenshot[];
  onUpload: (timeframe: Timeframe) => void;
  onViewFullscreen: (url: string) => void;
  className?: string;
  /** If provided, only show these timeframes in the upload dropdown */
  timeframesFilter?: Timeframe[];
}

const ALL_TIMEFRAMES: Timeframe[] = ["4H", "1H", "15M", "Execution"];

export function ScreenshotGallery({
  screenshots = [],
  onUpload,
  onViewFullscreen,
  className,
  timeframesFilter,
}: ScreenshotGalleryProps) {
  const availableTimeframes = timeframesFilter ?? ALL_TIMEFRAMES;

  const grouped = useMemo(() => {
    const groups: Record<string, TradeScreenshot[]> = {};
    ALL_TIMEFRAMES.forEach((tf) => (groups[tf] = []));
    ["1m", "5m"].forEach((tf) => (groups[tf] = []));

    screenshots.forEach((s) => {
      const tf =
        typeof s === "string" ? "Execution" : (s.timeframe ?? "Execution");
      const data =
        typeof s === "string"
          ? {
              url: s,
              timeframe: "Execution" as Timeframe,
              id: "legacy",
              trade_id: "legacy",
            }
          : s;
      if (groups[tf] !== undefined) {
        groups[tf].push(data);
      } else {
        groups["Execution"].push(data);
      }
    });

    return groups;
  }, [screenshots]);

  const getValidUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("/")) return url;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      return `${supabaseUrl}/storage/v1/object/public/trade-screenshots/${url}`;
    }
    return url;
  };

  const displayTimeframes = availableTimeframes;

  return (
    <div className={cn("p-4 flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-label" style={{ color: "var(--text-tertiary)" }}>
          Recorded Assets
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-[10px] rounded-md transition-all"
            >
              <Upload className="w-3 h-3 mr-1.5" />
              Upload
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px] p-1">
            <div
              className="px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider mb-1"
              style={{
                color: "var(--text-tertiary)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              Select timeframe
            </div>
            {availableTimeframes.map((tf) => (
              <DropdownMenuItem
                key={tf}
                onClick={() => onUpload(tf)}
                className="text-xs cursor-pointer py-2 rounded-sm"
              >
                <Clock className="w-3 h-3 mr-2 opacity-50" />
                {tf}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-6">
          {screenshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div
                className="relative"
                style={{ color: "var(--text-tertiary)", opacity: 0.4 }}
              >
                <ImageIcon className="w-12 h-12" />
                <Upload className="absolute -bottom-1 -right-1 w-5 h-5" />
              </div>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                No screenshots recorded
              </p>
              <p
                className="text-[10px] uppercase tracking-tighter italic"
                style={{ color: "var(--text-tertiary)", opacity: 0.6 }}
              >
                Waiting for execution data...
              </p>
            </div>
          ) : (
            displayTimeframes.map(
              (tf) =>
                grouped[tf]?.length > 0 && (
                  <div key={tf} className="space-y-3">
                    {/* Timeframe divider */}
                    <div className="flex items-center gap-2">
                      <div
                        className="h-px flex-1"
                        style={{ background: "var(--border-subtle)" }}
                      />
                      <span
                        className="text-[10px] font-mono uppercase tracking-[0.2em] px-2 italic"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        [{tf}_SNAPSHOT]
                      </span>
                      <div
                        className="h-px flex-1"
                        style={{ background: "var(--border-subtle)" }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {grouped[tf].map((s, i) => (
                        <div
                          key={i}
                          className="group relative aspect-video rounded-lg overflow-hidden cursor-pointer transition-all"
                          style={{
                            background: "var(--surface-elevated)",
                            border: "1px solid var(--border-default)",
                          }}
                          onClick={() => onViewFullscreen(s.url)}
                        >
                          <Image
                            src={getValidUrl(s.url)}
                            alt={`${tf} screenshot`}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          {/* Hover overlay */}
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"
                            style={{
                              background:
                                "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
                            }}
                          >
                            <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/80">
                              <Clock className="w-3 h-3" />
                              {s.created_at
                                ? format(new Date(s.created_at), "h:mm a")
                                : "RECORDED"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
