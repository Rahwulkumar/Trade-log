"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trade } from "@/lib/supabase/types";
import { 
  Search, 
  BookOpen, 
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { NoteEditor } from "@/components/notes";

export default function NotebookPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
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

  // Handle Updates
  const updateTradeField = async (field: keyof Trade, value: any) => {
    if (!selectedTradeId) return;
    
    // Optimistic Update
    setTrades(prev => prev.map(t => 
      t.id === selectedTradeId ? { ...t, [field]: value } : t
    ));

    // Debounced save could be better, but direct for now
    await supabase.from("trades").update({ [field]: value }).eq("id", selectedTradeId);
  };

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading Notebook...
        </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-60px)] -mx-6 -mt-8 overflow-hidden relative">
      
      {/* Sidebar: Trade List */}
      <aside className="w-80 shrink-0 bg-void-soft border-r border-white/5 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/5">
           <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Notebook</h2>
                <p className="text-xs text-muted-foreground">{trades.length} entries</p>
              </div>
            </div>
            
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search trades..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.02] border border-white/5 rounded-lg focus:border-blue-500/50 focus:outline-none transition-colors"
                />
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredTrades.map(trade => (
                <button
                    key={trade.id}
                    onClick={() => setSelectedTradeId(trade.id)}
                    className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all group",
                        selectedTradeId === trade.id 
                            ? "bg-blue-500/10 border-blue-500/30 shadow-sm" 
                            : "bg-transparent border-transparent hover:bg-white/5"
                    )}
                >
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm tracking-wide">{trade.symbol}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                            {format(new Date(trade.entry_date), "MMM d")}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className={cn(
                            "px-1.5 py-0.5 rounded font-bold uppercase",
                            trade.direction === "LONG" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        )}>
                            {trade.direction}
                        </span>
                        {trade.pnl !== undefined && (
                            <span className={cn(
                                "font-mono ml-auto",
                                trade.pnl > 0 ? "text-green-400" : trade.pnl < 0 ? "text-red-400" : "text-muted-foreground"
                            )}>
                                {trade.pnl > 0 ? "+" : ""}{trade.pnl}
                            </span>
                        )}
                    </div>
                </button>
            ))}
        </div>
      </aside>

      {/* Main Content: Editor */}
      <div className="flex-1 flex flex-col overflow-hidden bg-void relative">
        {selectedTrade ? (
            <>
                {/* Trade Header */}
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-void/50 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold tracking-tight">{selectedTrade.symbol}</h1>
                        <div className={cn(
                            "px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border",
                             selectedTrade.direction === "LONG" 
                                ? "bg-green-500/10 border-green-500/20 text-green-400" 
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                            {selectedTrade.direction}
                        </div>
                         <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-l border-white/10 pl-4 py-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(selectedTrade.entry_date), "MMM d, yyyy h:mm a")}
                        </div>
                    </div>
                    {selectedTrade.pnl !== null && (
                         <div className={cn(
                            "text-xl font-mono font-bold flex items-center gap-1",
                            selectedTrade.pnl > 0 ? "text-green-400" : "text-red-400"
                        )}>
                            <DollarSign className="h-5 w-5" />
                            {selectedTrade.pnl.toFixed(2)}
                        </div>
                    )}
                </div>

                {/* Journaling Area */}
                <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-8">
                    
                    {/* Notes (using NoteEditor for rich text if possible, or just textarea for MVP reliability) */}
                    {/* We used a textarea in the plan, but the existing NoteEditor is nice. Let's use a nice Textarea for now to ensure data binding is simple. */}
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-blue-400 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Trade Notes
                        </label>
                        <textarea
                            className="w-full h-40 bg-void-soft border border-white/10 rounded-xl p-4 text-sm leading-relaxed focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                            placeholder="Describe your execution, thought process, and market context..."
                            value={selectedTrade.notes || ""}
                            onChange={(e) => updateTradeField("notes", e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-sm font-medium text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Feelings
                            </label>
                             <input
                                className="w-full bg-void-soft border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                                placeholder="E.g., Confident, Anxious, FOMO..."
                                value={selectedTrade.feelings || ""}
                                onChange={(e) => updateTradeField("feelings", e.target.value)}
                            />
                        </div>
                         <div className="space-y-2">
                            <label className="text-sm font-medium text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                <TrendingDown className="h-4 w-4" />
                                Observations
                            </label>
                             <input
                                className="w-full bg-void-soft border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-all"
                                placeholder="E.g., Liquidity sweep, News event..."
                                value={selectedTrade.observations || ""}
                                onChange={(e) => updateTradeField("observations", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Screenshots */}
                    {selectedTrade.screenshots && selectedTrade.screenshots.length > 0 && (
                         <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Screenshots</label>
                            <div className="grid grid-cols-2 gap-4">
                                {selectedTrade.screenshots.map((url, i) => (
                                    <img key={i} src={url} className="rounded-lg border border-white/10 hover:opacity-90 transition-opacity cursor-pointer" />
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 opacity-50" />
                </div>
                <p>Select a trade to view journal entries</p>
            </div>
        )}
      </div>
    </div>
  );
}
