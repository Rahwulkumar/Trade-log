"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { TradeScreenshot } from "@/lib/terminal-farm/types";
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

type Timeframe = "4H" | "1H" | "15M" | "Execution";

interface ScreenshotGalleryProps {
  screenshots: TradeScreenshot[];
  onUpload: (timeframe: Timeframe) => void;
  onViewFullscreen: (url: string) => void;
  className?: string;
}

export function ScreenshotGallery({
  screenshots = [],
  onUpload,
  onViewFullscreen,
  className,
}: ScreenshotGalleryProps) {
  const grouped = useMemo(() => {
    const groups: Record<Timeframe, TradeScreenshot[]> = {
      "4H": [],
      "1H": [],
      "15M": [],
      Execution: [],
    };

    screenshots.forEach((s) => {
      const tf = (
        typeof s === "string" ? "Execution" : s.timeframe
      ) as Timeframe;
      const data =
        typeof s === "string"
          ? {
              url: s,
              timeframe: "Execution" as Timeframe,
              id: "legacy",
              trade_id: "legacy",
            }
          : s;

      if (groups[tf]) {
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

    // Fallback for legacy raw storage paths
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      return `${supabaseUrl}/storage/v1/object/public/trade-screenshots/${url}`;
    }
    return url;
  };

  const timeframes: Timeframe[] = ["4H", "1H", "15M", "Execution"];

  return (
    <div className={cn("p-4 flex flex-col h-full bg-transparent", className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Recorded Assets
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-zinc-950 border-white/10 text-zinc-400 hover:bg-zinc-900 text-[10px] h-7 px-3 rounded-md transition-all"
            >
              <Upload className="w-3 h-3 mr-2" />
              Upload asset
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-zinc-950 border-white/10 min-w-[140px] p-1 rounded-md"
          >
            <div className="px-2 py-1.5 text-[9px] font-semibold text-zinc-600 uppercase tracking-wider border-b border-white/5 mb-1">
              Select timeframe
            </div>
            {timeframes.map((tf) => (
              <DropdownMenuItem
                key={tf}
                onClick={() => onUpload(tf)}
                className="text-xs text-zinc-400 focus:bg-white/5 focus:text-white rounded-sm cursor-pointer py-2"
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
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 py-10">
              <div className="relative mb-4">
                <ImageIcon className="w-12 h-12" />
                <Upload className="absolute -bottom-1 -right-1 w-5 h-5" />
              </div>
              <p className="text-xs font-medium">No screenshots recorded</p>
              <p className="text-[10px] uppercase tracking-tighter mt-1 italic">
                Waiting for execution data...
              </p>
            </div>
          ) : (
            timeframes.map(
              (tf) =>
                grouped[tf].length > 0 && (
                  <div key={tf} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-white/5" />
                      <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-[0.2em] px-2 italic">
                        [{tf}_SNAPSHOT]
                      </span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {grouped[tf].map((s, i) => (
                        <div
                          key={i}
                          className="group relative aspect-video bg-black/40 rounded-lg overflow-hidden border border-white/5 cursor-pointer hover:border-blue-500/30 transition-all shadow-lg"
                          onClick={() =>
                            onViewFullscreen({
                              url: s.url,
                              timeframe: tf,
                              timestamp: s.timestamp
                                ? new Date(s.timestamp).toISOString()
                                : new Date().toISOString(),
                            } as unknown as TradeScreenshot)
                          }
                        >
                          <Image
                            src={getValidUrl(s.url)}
                            alt={`${tf} screenshot`}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <div className="flex items-center gap-1.5 text-[9px] text-white/70 font-mono">
                              <Clock className="w-3 h-3" />
                              {s.timestamp
                                ? format(new Date(s.timestamp), "h:mm a")
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
