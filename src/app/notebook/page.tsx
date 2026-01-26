"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trade } from "@/lib/supabase/types";
import { 
  Search, 
  Loader2, 
  ArrowUp, 
  ArrowDown,
  CalendarDays,
  Clock,
  Target,
  XCircle,
  MessageSquare,
  Brain,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function NotebookPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .order("entry_date", { ascending: false });

      if (error) throw error;
      setTrades(data || []);
      if (data && data.length > 0) {
        setSelectedTradeId(data[0].id);
      }
    } catch (e) {
      console.error("Failed to fetch trades", e);
    } finally {
      setLoading(false);
    }
  };

  const selectedTrade = useMemo(() => 
    trades.find(t => t.id === selectedTradeId), 
    [trades, selectedTradeId]
  );

  const filteredTrades = useMemo(() => {
    if (!searchQuery) return trades;
    const lower = searchQuery.toLowerCase();
    return trades.filter(t => 
      t.symbol.toLowerCase().includes(lower) || 
      (t.notes && t.notes.toLowerCase().includes(lower))
    );
  }, [trades, searchQuery]);

  const updateTradeField = async (field: keyof Trade, value: any) => {
    if (!selectedTradeId) return;
    
    setTrades(prev => prev.map(t => 
      t.id === selectedTradeId ? { ...t, [field]: value } : t
    ));

    setSaving(true);
    await supabase.from("trades").update({ [field]: value }).eq("id", selectedTradeId);
    setTimeout(() => setSaving(false), 500);
  };

  // Stats for selected trade
  const tradeStats = useMemo(() => {
    if (!selectedTrade) return null;
    return {
      duration: selectedTrade.exit_date 
        ? Math.round((new Date(selectedTrade.exit_date).getTime() - new Date(selectedTrade.entry_date).getTime()) / (1000 * 60 * 60))
        : null,
      risk: selectedTrade.stop_loss 
        ? Math.abs(selectedTrade.entry_price - selectedTrade.stop_loss) * selectedTrade.position_size
        : null,
    };
  }, [selectedTrade]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Trade List - Compact Table Style */}
      <div className="w-[340px] border-r border-white/5 flex flex-col bg-black/20">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search journal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/20"
            />
          </div>
        </div>

        {/* Trade List */}
        <div className="flex-1 overflow-y-auto">
          {filteredTrades.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground text-sm">No journal entries</p>
              <a href="/trades?new=true" className="text-blue-400 text-sm hover:underline mt-2 inline-block">
                Log a trade →
              </a>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-black/80 backdrop-blur-sm">
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-2 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Trade</th>
                  <th className="text-right pr-4 py-2 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">P&L</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map(trade => (
                  <tr 
                    key={trade.id}
                    onClick={() => setSelectedTradeId(trade.id)}
                    className={cn(
                      "cursor-pointer transition-colors border-l-2",
                      selectedTradeId === trade.id 
                        ? "bg-white/[0.06] border-l-blue-500" 
                        : "hover:bg-white/[0.03] border-l-transparent"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded flex items-center justify-center",
                          trade.direction === "LONG" ? "bg-emerald-500/20" : "bg-rose-500/20"
                        )}>
                          {trade.direction === "LONG" 
                            ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                            : <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
                          }
                        </div>
                        <div>
                          <p className="font-medium">{trade.symbol}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(trade.entry_date), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right pr-4">
                      <span className={cn(
                        "font-mono font-medium",
                        trade.pnl > 0 ? "text-emerald-400" : trade.pnl < 0 ? "text-rose-400" : "text-muted-foreground"
                      )}>
                        {trade.pnl > 0 ? "+" : ""}{trade.pnl?.toFixed(2) ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Stats */}
        <div className="px-4 py-3 border-t border-white/5 text-xs text-muted-foreground">
          {trades.length} entries • {trades.filter(t => t.notes).length} with notes
        </div>
      </div>

      {/* Journal Editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-black/10">
        {selectedTrade ? (
          <>
            {/* Trade Header Bar */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  selectedTrade.direction === "LONG" ? "bg-emerald-500/20" : "bg-rose-500/20"
                )}>
                  {selectedTrade.direction === "LONG" 
                    ? <ArrowUp className="w-5 h-5 text-emerald-400" />
                    : <ArrowDown className="w-5 h-5 text-rose-400" />
                  }
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold">{selectedTrade.symbol}</h1>
                    <span className={cn(
                      "text-2xl font-mono font-bold",
                      selectedTrade.pnl > 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {selectedTrade.pnl > 0 ? "+" : ""}${selectedTrade.pnl?.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {format(new Date(selectedTrade.entry_date), "EEEE, MMMM d, yyyy")}
                    </span>
                    {tradeStats?.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {tradeStats.duration}h duration
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {saving && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="px-6 py-3 border-b border-white/5 flex gap-6">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Entry:</span>
                <span className="font-mono">${selectedTrade.entry_price}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Exit:</span>
                <span className="font-mono">{selectedTrade.exit_price ? `$${selectedTrade.exit_price}` : "Open"}</span>
              </div>
              {selectedTrade.stop_loss && (
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-mono">${selectedTrade.stop_loss}</span>
                </div>
              )}
              {selectedTrade.take_profit && (
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono">${selectedTrade.take_profit}</span>
                </div>
              )}
              {selectedTrade.r_multiple && (
                <div className="flex items-center gap-2 text-sm ml-auto">
                  <span className={cn(
                    "font-mono font-medium",
                    selectedTrade.r_multiple > 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {selectedTrade.r_multiple > 0 ? "+" : ""}{selectedTrade.r_multiple.toFixed(1)}R
                  </span>
                </div>
              )}
            </div>

            {/* Journal Sections */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl space-y-6">
                
                {/* Trade Notes */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wide">Trade Notes</h3>
                  </div>
                  <textarea
                    className="w-full h-40 bg-white/[0.03] border border-white/10 rounded-lg p-4 text-sm leading-relaxed resize-none focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.05] transition-colors placeholder:text-muted-foreground/40"
                    placeholder="What was your thesis? How did you execute? What happened during the trade?"
                    value={selectedTrade.notes || ""}
                    onChange={(e) => updateTradeField("notes", e.target.value)}
                  />
                </section>

                {/* Psychology Section */}
                <section className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wide">Feelings</h3>
                    </div>
                    <input
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-colors placeholder:text-muted-foreground/40"
                      placeholder="Confident, anxious, FOMO, revenge..."
                      value={selectedTrade.feelings || ""}
                      onChange={(e) => updateTradeField("feelings", e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-medium text-amber-400 uppercase tracking-wide">Observations</h3>
                    </div>
                    <input
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.05] transition-colors placeholder:text-muted-foreground/40"
                      placeholder="Market conditions, patterns, news..."
                      value={selectedTrade.observations || ""}
                      onChange={(e) => updateTradeField("observations", e.target.value)}
                    />
                  </div>
                </section>

                {/* Screenshots */}
                {selectedTrade.screenshots && selectedTrade.screenshots.length > 0 && (
                  <section>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Screenshots</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedTrade.screenshots.map((url, i) => (
                        <img 
                          key={i} 
                          src={url} 
                          className="rounded-lg border border-white/10 hover:border-white/20 transition-colors cursor-pointer" 
                          alt={`Chart ${i + 1}`}
                        />
                      ))}
                    </div>
                  </section>
                )}

              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 mb-4">
                <MessageSquare className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-lg font-medium mb-2">Trade Journal</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Select a trade from the list to add notes, record your emotions, and document market observations.
              </p>
              {trades.length === 0 && (
                <a href="/trades?new=true" className="btn-glow inline-flex">
                  Log Your First Trade
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
