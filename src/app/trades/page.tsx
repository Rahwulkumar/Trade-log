"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  MoreHorizontal,
  Plus,
  Search,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// Card, Button unused

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import {
  getTrades,
  createTrade,
  deleteTrade,
  closeTrade,
  updateTrade,
  type TradeFilters,
} from "@/lib/api/trades";
import {
  uploadTradeScreenshot,
  deleteTradeScreenshot,
} from "@/lib/api/storage";
import { getActivePlaybooks } from "@/lib/api/playbooks";
import { ScreenshotUpload } from "@/components/ui/screenshot-upload";
import type { Trade, Playbook, TradeScreenshot } from "@/lib/supabase/types";

function TradesContent() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId, propAccounts } = usePropAccount();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">(
    "all",
  );
  const [directionFilter, setDirectionFilter] = useState<
    "all" | "LONG" | "SHORT"
  >("all");
  const [isNewTradeOpen, setIsNewTradeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close trade dialog state
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);
  const [exitPrice, setExitPrice] = useState("");
  const [exitDate, setExitDate] = useState(
    new Date().toISOString().slice(0, 16),
  );

  // Edit trade dialog state
  const [isEditTradeOpen, setIsEditTradeOpen] = useState(false);
  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);
  // Form state
  const [formData, setFormData] = useState({
    symbol: "",
    direction: "" as "LONG" | "SHORT" | "",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    position_size: "",
    playbook_id: "",
    prop_account_id: "none", // 'none' represents null/unassigned
    notes: "",
    entry_date: new Date().toISOString().slice(0, 16),
    screenshots: [] as string[],
  });

  // Open New Trade Dialog with default prop account
  const openNewTradeDialog = useCallback(() => {
    // Default prop account to global selection if valid
    const defaultPropAccount =
      selectedAccountId && selectedAccountId !== "all"
        ? selectedAccountId
        : "none";

    setFormData((prev) => ({
      ...prev,
      prop_account_id: defaultPropAccount,
      entry_date: new Date().toISOString().slice(0, 16),
    }));
    setIsNewTradeOpen(true);
  }, [selectedAccountId]);

  // Check for ?new=true to auto-open dialog (from header button)
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      openNewTradeDialog();
      // Remove the query param from URL
      router.replace("/trades", { scroll: false });
    }
  }, [searchParams, router, openNewTradeDialog]);

  // Load trades
  const loadTrades = useCallback(async () => {
    console.log(
      "[Trades] loadTrades called, user:",
      user?.id,
      "isConfigured:",
      isConfigured,
    );

    if (!isConfigured || !user) {
      console.log("[Trades] Skipping load - not configured or no user");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const filters: TradeFilters = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (directionFilter !== "all") filters.direction = directionFilter;
      if (searchQuery) filters.search = searchQuery;

      // Apply global prop account filter
      if (selectedAccountId === "unassigned") {
        filters.propAccountId = "unassigned";
      } else if (selectedAccountId) {
        filters.propAccountId = selectedAccountId;
      }

      console.log("[Trades] Fetching trades with filters:", filters);

      const [tradesData, playbooksData] = await Promise.all([
        getTrades(filters),
        getActivePlaybooks(),
      ]);

      console.log(
        "[Trades] Fetched",
        tradesData.length,
        "trades and",
        playbooksData.length,
        "playbooks",
      );

      setTrades(tradesData);
      setPlaybooks(playbooksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades");
    } finally {
      setLoading(false);
    }
  }, [
    isConfigured,
    user,
    statusFilter,
    directionFilter,
    searchQuery,
    selectedAccountId,
  ]);

  useEffect(() => {
    if (!authLoading) {
      loadTrades();
    }
  }, [
    user,
    isConfigured,
    authLoading,
    statusFilter,
    directionFilter,
    selectedAccountId,
    loadTrades,
  ]);

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !formData.symbol ||
      !formData.direction ||
      !formData.entry_price ||
      !formData.position_size
    ) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createTrade({
        symbol: formData.symbol.toUpperCase(),
        direction: formData.direction as "LONG" | "SHORT",
        entry_price: parseFloat(formData.entry_price),
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit
          ? parseFloat(formData.take_profit)
          : null,
        position_size: parseFloat(formData.position_size),
        playbook_id:
          formData.playbook_id && formData.playbook_id !== "none"
            ? formData.playbook_id
            : null,
        prop_account_id:
          formData.prop_account_id &&
          formData.prop_account_id !== "none" &&
          formData.prop_account_id !== "unassigned"
            ? formData.prop_account_id
            : null,
        notes: formData.notes || null,
        entry_date: formData.entry_date,
        status: "open",
        screenshots:
          formData.screenshots.length > 0
            ? formData.screenshots.map((url) => ({
                url,
                timeframe: "Execution" as const,
                timestamp: new Date().toISOString(),
              }))
            : null,
      });

      // Reset form and close dialog
      setFormData({
        symbol: "",
        direction: "",
        entry_price: "",
        stop_loss: "",
        take_profit: "",
        position_size: "",
        playbook_id: "",
        prop_account_id: "none",
        notes: "",
        entry_date: new Date().toISOString().slice(0, 16),
        screenshots: [],
      });
      setIsNewTradeOpen(false);

      // Reload trades
      await loadTrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trade");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle delete
  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this trade?")) return;

    try {
      await deleteTrade(id);
      await loadTrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete trade");
    }
  }

  // Handle close trade
  function openCloseDialog(trade: Trade) {
    setTradeToClose(trade);
    setExitPrice("");
    setExitDate(new Date().toISOString().slice(0, 16));
    setIsCloseDialogOpen(true);
  }

  async function handleCloseTrade() {
    if (!tradeToClose || !exitPrice) return;

    setIsSubmitting(true);
    try {
      await closeTrade(tradeToClose.id, parseFloat(exitPrice), exitDate);
      setIsCloseDialogOpen(false);
      setTradeToClose(null);
      await loadTrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close trade");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle edit trade
  function openEditDialog(trade: Trade) {
    setTradeToEdit(trade);
    setFormData({
      symbol: trade.symbol,
      direction: trade.direction as "LONG" | "SHORT",
      entry_price: trade.entry_price.toString(),
      stop_loss: trade.stop_loss?.toString() || "",
      take_profit: trade.take_profit?.toString() || "",
      position_size: trade.position_size.toString(),
      playbook_id: trade.playbook_id || "none",
      prop_account_id: trade.prop_account_id || "none",
      notes: trade.notes || "",
      entry_date: new Date(trade.entry_date).toISOString().slice(0, 16),
      screenshots: (
        (trade.screenshots as (TradeScreenshot | string)[]) || []
      ).map((s: TradeScreenshot | string) =>
        typeof s === "string" ? s : s.url,
      ),
    });
    setIsEditTradeOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tradeToEdit) return;

    setIsSubmitting(true);
    try {
      await updateTrade(tradeToEdit.id, {
        symbol: formData.symbol.toUpperCase(),
        direction: formData.direction as "LONG" | "SHORT",
        entry_price: parseFloat(formData.entry_price),
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit
          ? parseFloat(formData.take_profit)
          : null,
        position_size: parseFloat(formData.position_size),
        playbook_id:
          formData.playbook_id && formData.playbook_id !== "none"
            ? formData.playbook_id
            : null,
        prop_account_id:
          formData.prop_account_id &&
          formData.prop_account_id !== "none" &&
          formData.prop_account_id !== "unassigned"
            ? formData.prop_account_id
            : null,
        notes: formData.notes || null,
        entry_date: formData.entry_date,
        screenshots:
          formData.screenshots.length > 0
            ? formData.screenshots.map((url) => ({
                url,
                timeframe: "Execution" as const,
                timestamp: new Date().toISOString(),
              }))
            : null,
      });
      setIsEditTradeOpen(false);
      setTradeToEdit(null);
      await loadTrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update trade");
    } finally {
      setIsSubmitting(false);
    }
  }

  // openNewTradeDialog moved up

  // Filter trades by search
  const filteredTrades = trades.filter((trade) => {
    if (!searchQuery) return true;
    return trade.symbol.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalPnL = filteredTrades.reduce(
    (sum, trade) => sum + (trade.pnl || 0),
    0,
  );
  const winningTrades = filteredTrades.filter((t) => (t.pnl || 0) > 0).length;
  const losingTrades = filteredTrades.filter((t) => (t.pnl || 0) < 0).length;

  // Show auth required message
  if (!authLoading && !isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">
            Supabase Not Configured
          </h2>
          <p className="text-muted-foreground mb-4">
            Please add your Supabase credentials to{" "}
            <code className="bg-void px-1 rounded">.env.local</code> to use this
            feature.
          </p>
        </div>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to view and manage your trades.
          </p>
          <a
            href="/auth/login"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 rounded-lg font-medium"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="text-center space-y-4 py-6">
        <p className="text-label">Trade Log</p>
        <h1 className="headline-lg">All Trades</h1>
      </section>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Summary */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-6 text-center">
          <p className="text-label mb-2">Total</p>
          <p className="stat-large">{filteredTrades.length}</p>
        </div>
        <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-6 text-center">
          <p className="text-label mb-2">Winners</p>
          <p className="stat-large profit">{winningTrades}</p>
        </div>
        <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-6 text-center">
          <p className="text-label mb-2">Losers</p>
          <p className="stat-large loss">{losingTrades}</p>
        </div>
        <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-6 text-center">
          <p className="text-label mb-2">Total P&L</p>
          <p className={cn("stat-large", totalPnL >= 0 ? "profit" : "loss")}>
            {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
          </p>
        </div>
      </section>

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-void-surface border-white/10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-[130px] bg-void-surface border-white/10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={directionFilter}
            onValueChange={(v) =>
              setDirectionFilter(v as typeof directionFilter)
            }
          >
            <SelectTrigger className="w-[130px] bg-void-surface border-white/10">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Directions</SelectItem>
              <SelectItem value="LONG">Long</SelectItem>
              <SelectItem value="SHORT">Short</SelectItem>
            </SelectContent>
          </Select>
          <button
            className="bg-transparent border border-white/10 hover:bg-white/5 p-2 rounded-lg"
            onClick={loadTrades}
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
        <Dialog open={isNewTradeOpen} onOpenChange={setIsNewTradeOpen}>
          <DialogTrigger asChild>
            <button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 rounded-lg font-medium"
              onClick={(e) => {
                e.preventDefault();
                openNewTradeDialog();
              }}
            >
              <Plus className="h-4 w-4" />
              New Trade
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-void-surface border-white/10">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Log New Trade</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Enter your trade details below. All fields marked with * are
                  required.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol *</Label>
                    <Input
                      id="symbol"
                      placeholder="e.g., EUR/USD"
                      className="bg-void border-white/10"
                      value={formData.symbol}
                      onChange={(e) =>
                        setFormData({ ...formData, symbol: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="direction">Direction *</Label>
                    <Select
                      value={formData.direction}
                      onValueChange={(v) =>
                        setFormData({
                          ...formData,
                          direction: v as "LONG" | "SHORT",
                        })
                      }
                    >
                      <SelectTrigger className="bg-void border-white/10">
                        <SelectValue placeholder="Select direction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LONG">Long</SelectItem>
                        <SelectItem value="SHORT">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entry_price">Entry Price *</Label>
                    <Input
                      id="entry_price"
                      type="number"
                      step="any"
                      placeholder="1.0845"
                      className="bg-void border-white/10"
                      value={formData.entry_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          entry_price: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position_size">Position Size *</Label>
                    <Input
                      id="position_size"
                      type="number"
                      step="any"
                      placeholder="1.0"
                      className="bg-void border-white/10"
                      value={formData.position_size}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          position_size: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stop_loss">Stop Loss</Label>
                    <Input
                      id="stop_loss"
                      type="number"
                      step="any"
                      placeholder="1.0800"
                      className="bg-void border-white/10"
                      value={formData.stop_loss}
                      onChange={(e) =>
                        setFormData({ ...formData, stop_loss: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="take_profit">Take Profit</Label>
                    <Input
                      id="take_profit"
                      type="number"
                      step="any"
                      placeholder="1.0920"
                      className="bg-void border-white/10"
                      value={formData.take_profit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          take_profit: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entry_date">Entry Date/Time *</Label>
                    <Input
                      id="entry_date"
                      type="datetime-local"
                      className="bg-void border-white/10"
                      value={formData.entry_date}
                      onChange={(e) =>
                        setFormData({ ...formData, entry_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="playbook">Playbook</Label>
                    <Select
                      value={formData.playbook_id}
                      onValueChange={(v) =>
                        setFormData({ ...formData, playbook_id: v })
                      }
                    >
                      <SelectTrigger className="bg-void border-white/10">
                        <SelectValue placeholder="Select playbook" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {playbooks.map((pb) => (
                          <SelectItem key={pb.id} value={pb.id}>
                            {pb.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prop_account">Prop Account</Label>
                  <Select
                    value={formData.prop_account_id}
                    onValueChange={(v) =>
                      setFormData({ ...formData, prop_account_id: v })
                    }
                  >
                    <SelectTrigger className="bg-void border-white/10">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {propAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Trade Rationale</Label>
                  <Textarea
                    id="notes"
                    placeholder="Why are you taking this trade?"
                    rows={3}
                    className="bg-void border-white/10"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Screenshots</Label>
                  <ScreenshotUpload
                    screenshots={formData.screenshots}
                    onScreenshotsChange={(screenshots) =>
                      setFormData({ ...formData, screenshots })
                    }
                    onUpload={async (file) => {
                      if (!user) throw new Error("Not authenticated");
                      return uploadTradeScreenshot(file, user.id);
                    }}
                    onDelete={deleteTradeScreenshot}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  className="bg-transparent border border-white/10 hover:bg-white/5 px-4 py-2 rounded-lg"
                  onClick={() => setIsNewTradeOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 rounded-lg font-medium"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Log Trade"
                  )}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Close Trade Dialog */}
        <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
          <DialogContent className="sm:max-w-md bg-void-surface border-white/10">
            <DialogHeader>
              <DialogTitle>Close Trade</DialogTitle>
              <DialogDescription>
                Enter the exit details for {tradeToClose?.symbol} (
                {tradeToClose?.direction})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="exit_price">Exit Price *</Label>
                <Input
                  id="exit_price"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  className="bg-void border-white/10"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exit_date">Exit Date/Time *</Label>
                <Input
                  id="exit_date"
                  type="datetime-local"
                  className="bg-void border-white/10"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  required
                />
              </div>
              {tradeToClose && (
                <div className="text-sm text-muted-foreground">
                  <p>Entry Price: ${tradeToClose.entry_price}</p>
                  <p>Position Size: {tradeToClose.position_size}</p>
                  {exitPrice && (
                    <p
                      className={`font-medium mt-2 ${
                        (
                          tradeToClose.direction === "LONG"
                            ? parseFloat(exitPrice) > tradeToClose.entry_price
                            : parseFloat(exitPrice) < tradeToClose.entry_price
                        )
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      Estimated P&L: $
                      {(tradeToClose.direction === "LONG"
                        ? (parseFloat(exitPrice) - tradeToClose.entry_price) *
                          tradeToClose.position_size
                        : (tradeToClose.entry_price - parseFloat(exitPrice)) *
                          tradeToClose.position_size
                      ).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <button
                type="button"
                className="bg-transparent border border-white/10 hover:bg-white/5 px-4 py-2 rounded-lg"
                onClick={() => setIsCloseDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 rounded-lg font-medium"
                disabled={isSubmitting || !exitPrice}
                onClick={handleCloseTrade}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Close Trade"
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Trade Dialog */}
        <Dialog open={isEditTradeOpen} onOpenChange={setIsEditTradeOpen}>
          <DialogContent className="sm:max-w-lg bg-void-surface border-white/10">
            <DialogHeader>
              <DialogTitle>Edit Trade</DialogTitle>
              <DialogDescription>
                Update the details for this trade
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_symbol">Symbol *</Label>
                    <Input
                      id="edit_symbol"
                      placeholder="e.g. AAPL, EUR/USD"
                      className="bg-void border-white/10"
                      value={formData.symbol}
                      onChange={(e) =>
                        setFormData({ ...formData, symbol: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_direction">Direction *</Label>
                    <Select
                      value={formData.direction}
                      onValueChange={(v) =>
                        setFormData({
                          ...formData,
                          direction: v as "LONG" | "SHORT",
                        })
                      }
                    >
                      <SelectTrigger className="bg-void border-white/10">
                        <SelectValue placeholder="Select direction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LONG">Long</SelectItem>
                        <SelectItem value="SHORT">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_entry_price">Entry Price *</Label>
                    <Input
                      id="edit_entry_price"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      className="bg-void border-white/10"
                      value={formData.entry_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          entry_price: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_position_size">Position Size *</Label>
                    <Input
                      id="edit_position_size"
                      type="number"
                      step="any"
                      placeholder="0"
                      className="bg-void border-white/10"
                      value={formData.position_size}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          position_size: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_stop_loss">Stop Loss</Label>
                    <Input
                      id="edit_stop_loss"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      className="bg-void border-white/10"
                      value={formData.stop_loss}
                      onChange={(e) =>
                        setFormData({ ...formData, stop_loss: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_take_profit">Take Profit</Label>
                    <Input
                      id="edit_take_profit"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      className="bg-void border-white/10"
                      value={formData.take_profit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          take_profit: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_entry_date">Entry Date/Time *</Label>
                    <Input
                      id="edit_entry_date"
                      type="datetime-local"
                      className="bg-void border-white/10"
                      value={formData.entry_date}
                      onChange={(e) =>
                        setFormData({ ...formData, entry_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_playbook">Playbook</Label>
                    <Select
                      value={formData.playbook_id}
                      onValueChange={(v) =>
                        setFormData({ ...formData, playbook_id: v })
                      }
                    >
                      <SelectTrigger className="bg-void border-white/10">
                        <SelectValue placeholder="Select playbook" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {playbooks.map((pb) => (
                          <SelectItem key={pb.id} value={pb.id}>
                            {pb.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_prop_account">Prop Account</Label>
                  <Select
                    value={formData.prop_account_id}
                    onValueChange={(v) =>
                      setFormData({ ...formData, prop_account_id: v })
                    }
                  >
                    <SelectTrigger className="bg-void border-white/10">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {propAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_notes">Notes</Label>
                  <Textarea
                    id="edit_notes"
                    placeholder="Trade notes..."
                    rows={2}
                    className="bg-void border-white/10"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Screenshots</Label>
                  <ScreenshotUpload
                    screenshots={formData.screenshots}
                    onScreenshotsChange={(screenshots) =>
                      setFormData({ ...formData, screenshots })
                    }
                    onUpload={async (file) => {
                      if (!user) throw new Error("Not authenticated");
                      return uploadTradeScreenshot(file, user.id);
                    }}
                    onDelete={deleteTradeScreenshot}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  className="bg-transparent border border-white/10 hover:bg-white/5 px-4 py-2 rounded-lg"
                  onClick={() => setIsEditTradeOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 rounded-lg font-medium"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTrades.length === 0 && (
        <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No trades found. Start by logging your first trade!
          </p>
          <button
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 rounded-lg font-medium"
            onClick={() => setIsNewTradeOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Log Your First Trade
          </button>
        </div>
      )}

      {/* Trades Table */}
      {!loading && filteredTrades.length > 0 && (
        <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-0 overflow-hidden">
          <table className="table-void w-full">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Direction</th>
                <th className="text-right">Entry</th>
                <th className="text-right">Exit</th>
                <th className="text-right">P&L</th>
                <th className="text-right">R-Multiple</th>
                <th>Date</th>
                <th className="w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="cursor-pointer">
                  <td className="font-medium">{trade.symbol}</td>
                  <td>
                    <span
                      className={cn(
                        "badge-void inline-flex items-center gap-1",
                        trade.direction === "LONG"
                          ? "badge-profit"
                          : "badge-loss",
                      )}
                    >
                      {trade.direction === "LONG" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {trade.direction}
                    </span>
                  </td>
                  <td className="text-right mono text-muted-foreground">
                    {trade.entry_price}
                  </td>
                  <td className="text-right mono text-muted-foreground">
                    {trade.exit_price || (
                      <span className="badge-void text-xs">Open</span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "text-right font-medium mono",
                      (trade.pnl || 0) >= 0 ? "profit" : "loss",
                    )}
                  >
                    {(trade.pnl || 0) >= 0 ? "+" : ""}$
                    {(trade.pnl || 0).toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "text-right mono",
                      (trade.r_multiple || 0) >= 0 ? "" : "loss",
                    )}
                  >
                    {trade.r_multiple
                      ? `${trade.r_multiple >= 0 ? "+" : ""}${trade.r_multiple.toFixed(1)}R`
                      : "-"}
                  </td>
                  <td className="text-muted-foreground">
                    {new Date(trade.entry_date).toLocaleDateString()}
                  </td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-white/5 rounded transition-colors">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-void-surface border-white/10"
                      >
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(trade)}>
                          Edit Trade
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openCloseDialog(trade)}
                        >
                          Close Trade
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-500"
                          onClick={() => handleDelete(trade.id)}
                        >
                          Delete Trade
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TradesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      }
    >
      <TradesContent />
    </Suspense>
  );
}
