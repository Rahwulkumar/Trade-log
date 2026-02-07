"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Plus,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  Copy,
  ArrowUpRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  createPlaybook,
  deletePlaybook,
  duplicatePlaybook,
  togglePlaybookActive,
  getAllPlaybooksWithStats,
} from "@/lib/api/playbooks";
import type { Playbook } from "@/lib/supabase/types";

interface PlaybookWithStats extends Playbook {
  stats?: {
    totalTrades: number;
    winRate: number;
    avgRMultiple: number;
    totalPnl: number;
  };
}

export default function PlaybooksPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId } = usePropAccount();
  const [playbooks, setPlaybooks] = useState<PlaybookWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewPlaybookOpen, setIsNewPlaybookOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rules: "",
  });

  // Load playbooks with stats
  const loadPlaybooks = useCallback(async () => {
    if (!isConfigured || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Apply global prop account filter
      const propAccountIdFilter =
        selectedAccountId === "unassigned" ? "unassigned" : selectedAccountId;

      const stats = await getAllPlaybooksWithStats(propAccountIdFilter);
      const playbooksWithStats: PlaybookWithStats[] = stats.map((s) => ({
        ...s.playbook,
        stats: {
          totalTrades: s.totalTrades,
          winRate: s.winRate,
          avgRMultiple: s.avgRMultiple,
          totalPnl: s.totalPnl,
        },
      }));

      setPlaybooks(playbooksWithStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load playbooks");
    } finally {
      setLoading(false);
    }
  }, [isConfigured, user, selectedAccountId]);

  useEffect(() => {
    if (!authLoading) {
      loadPlaybooks();
    }
  }, [user, isConfigured, authLoading, selectedAccountId, loadPlaybooks]);

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name) {
      setError("Please enter a playbook name");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createPlaybook({
        name: formData.name,
        description: formData.description || null,
        rules: formData.rules
          ? formData.rules.split("\n").filter((r) => r.trim())
          : null,
        is_active: true,
      });

      // Reset form and close dialog
      setFormData({ name: "", description: "", rules: "" });
      setIsNewPlaybookOpen(false);

      // Reload playbooks
      await loadPlaybooks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create playbook",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle delete
  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this playbook?")) return;

    try {
      await deletePlaybook(id);
      await loadPlaybooks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete playbook",
      );
    }
  }

  // Handle duplicate
  async function handleDuplicate(id: string) {
    try {
      await duplicatePlaybook(id);
      await loadPlaybooks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to duplicate playbook",
      );
    }
  }

  // Handle toggle active
  async function handleToggleActive(id: string) {
    try {
      await togglePlaybookActive(id);
      await loadPlaybooks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update playbook",
      );
    }
  }

  const activePlaybooks = playbooks.filter((p) => p.is_active);
  const totalPnL = playbooks.reduce(
    (sum, p) => sum + (p.stats?.totalPnl || 0),
    0,
  );
  const avgWinRate =
    playbooks.length > 0
      ? playbooks.reduce((sum, p) => sum + (p.stats?.winRate || 0), 0) /
        playbooks.length
      : 0;

  // Show auth required message
  if (!authLoading && !isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Card className="bg-black/60 backdrop-blur-xl border-white/5 p-8 text-center max-w-md">
          <CardContent>
            <h2 className="text-xl font-semibold mb-2">
              Supabase Not Configured
            </h2>
            <p className="text-muted-foreground mb-4">
              Please add your Supabase credentials to enable this feature.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Card className="bg-black/60 backdrop-blur-xl border-white/5 p-8 text-center max-w-md">
          <CardContent>
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to view and manage your playbooks.
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <a href="/auth/login">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-label mb-1">Strategies</p>
          <h1 className="headline-lg">Playbooks</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="bg-transparent border-white/10 hover:bg-white/5"
            onClick={loadPlaybooks}
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Dialog open={isNewPlaybookOpen} onOpenChange={setIsNewPlaybookOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Plus className="h-4 w-4" />
                New Playbook
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-void-surface border-white/10">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New Playbook</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Define your trading strategy rules and criteria.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Playbook Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., ICT Order Block"
                      className="bg-void border-white/10"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your trading strategy..."
                      rows={3}
                      className="bg-void border-white/10"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rules">Entry Rules (one per line)</Label>
                    <Textarea
                      id="rules"
                      placeholder="Rule 1&#10;Rule 2&#10;Rule 3"
                      rows={4}
                      className="bg-void border-white/10"
                      value={formData.rules}
                      onChange={(e) =>
                        setFormData({ ...formData, rules: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="bg-transparent border-white/10 hover:bg-white/5"
                    onClick={() => setIsNewPlaybookOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create Playbook"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
        <Card className="bg-black/60 backdrop-blur-xl border-white/5">
          <CardContent className="p-6 text-center">
            <p className="text-label mb-2">Total</p>
            <p className="stat-large">{playbooks.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-black/60 backdrop-blur-xl border-white/5">
          <CardContent className="p-6 text-center">
            <p className="text-label mb-2">Active</p>
            <p className="stat-large profit">{activePlaybooks.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-black/60 backdrop-blur-xl border-white/5">
          <CardContent className="p-6 text-center">
            <p className="text-label mb-2">Avg Win Rate</p>
            <p className="stat-large">{avgWinRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="bg-black/60 backdrop-blur-xl border-white/5">
          <CardContent className="p-6 text-center">
            <p className="text-label mb-2">Total P&L</p>
            <p className={cn("stat-large", totalPnL >= 0 ? "profit" : "loss")}>
              {totalPnL >= 0 ? "+" : ""}${totalPnL.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!loading && playbooks.length === 0 && (
        <Card className="bg-black/60 backdrop-blur-xl border-white/5 p-12 text-center">
          <CardContent>
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No playbooks yet. Create your first trading strategy!
            </p>
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={() => setIsNewPlaybookOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Your First Playbook
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Playbooks Grid */}
      {!loading && playbooks.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((playbook) => (
            <Card
              key={playbook.id}
              className={cn(
                "bg-black/60 backdrop-blur-xl border-white/5",
                !playbook.is_active && "opacity-60",
              )}
            >
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        (playbook.stats?.totalPnl || 0) >= 0
                          ? "bg-green-500/10"
                          : "bg-red-500/10",
                      )}
                    >
                      <BookOpen
                        className={cn(
                          "h-4 w-4",
                          (playbook.stats?.totalPnl || 0) >= 0
                            ? "text-green-500"
                            : "text-red-500",
                        )}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold">{playbook.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {(playbook.stats?.totalPnl || 0) > 0 && (
                          <TrendingUp className="h-3 w-3 profit" />
                        )}
                        {(playbook.stats?.totalPnl || 0) < 0 && (
                          <TrendingDown className="h-3 w-3 loss" />
                        )}
                        {!playbook.is_active && (
                          <span className="badge-void text-xs">Inactive</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 hover:bg-white/5 rounded transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-[#0a0a0a] border-white/10"
                    >
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(playbook.id)}
                      >
                        <Copy className="h-4 w-4 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleActive(playbook.id)}
                      >
                        {playbook.is_active ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => handleDelete(playbook.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {playbook.description || "No description"}
                </p>

                {/* Win Rate Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="font-medium">
                      {(playbook.stats?.winRate || 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{
                        width: `${Math.min(playbook.stats?.winRate || 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div>
                    <div className="text-lg font-semibold">
                      {playbook.stats?.totalTrades || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Trades</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {(playbook.stats?.avgRMultiple || 0).toFixed(1)}R
                    </div>
                    <div className="text-xs text-muted-foreground">Avg R</div>
                  </div>
                  <div>
                    <div
                      className={cn(
                        "text-lg font-semibold mono",
                        (playbook.stats?.totalPnl || 0) >= 0
                          ? "profit"
                          : "loss",
                      )}
                    >
                      $
                      {Math.abs(playbook.stats?.totalPnl || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">P&L</div>
                  </div>
                </div>

                {/* Rules Preview */}
                {playbook.rules &&
                  Array.isArray(playbook.rules) &&
                  playbook.rules.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      <span className="badge-void text-xs">
                        {playbook.rules.length} rules
                      </span>
                    </div>
                  )}

                <button className="w-full py-2 text-sm text-muted-foreground hover:text-white transition-colors flex items-center justify-center gap-2 border-t border-white/5 -mx-6 px-6 -mb-6 mt-4">
                  View Details
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
