"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Copy,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
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
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import {
  createPlaybook,
  deletePlaybook,
  duplicatePlaybook,
  getAllPlaybooksWithStats,
  togglePlaybookActive,
} from "@/lib/api/playbooks";
import type { Playbook } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import {
  AppMetricCard,
  AppPageHeader,
  AppPanel,
} from "@/components/ui/page-primitives";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { NoDataEmpty } from "@/components/ui/empty-state";
import { IconSearch } from "@/components/ui/icons";

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
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rules: "",
  });

  const loadPlaybooks = useCallback(async () => {
    if (!isConfigured || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const propAccountIdFilter =
        selectedAccountId === "unassigned" ? "unassigned" : selectedAccountId;

      const stats = await getAllPlaybooksWithStats(propAccountIdFilter);
      const playbooksWithStats: PlaybookWithStats[] = stats.map((item) => ({
        ...item.playbook,
        stats: {
          totalTrades: item.totalTrades,
          winRate: item.winRate,
          avgRMultiple: item.avgRMultiple,
          totalPnl: item.totalPnl,
        },
      }));
      setPlaybooks(playbooksWithStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load playbooks");
    } finally {
      setLoading(false);
    }
  }, [isConfigured, selectedAccountId, user]);

  useEffect(() => {
    if (!authLoading) {
      loadPlaybooks();
    }
  }, [authLoading, loadPlaybooks]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!formData.name.trim()) {
      setError("Please enter a playbook name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createPlaybook({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        rules: formData.rules
          ? formData.rules
              .split("\n")
              .map((rule) => rule.trim())
              .filter(Boolean)
          : null,
        is_active: true,
      });
      setFormData({ name: "", description: "", rules: "" });
      setIsNewPlaybookOpen(false);
      await loadPlaybooks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create playbook",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(playbookId: string) {
    if (!confirm("Delete this playbook? This action cannot be undone.")) {
      return;
    }
    try {
      await deletePlaybook(playbookId);
      await loadPlaybooks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete playbook",
      );
    }
  }

  async function handleDuplicate(playbookId: string) {
    try {
      await duplicatePlaybook(playbookId);
      await loadPlaybooks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to duplicate playbook",
      );
    }
  }

  async function handleToggleActive(playbookId: string) {
    try {
      await togglePlaybookActive(playbookId);
      await loadPlaybooks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update playbook status",
      );
    }
  }

  const summaryCards = useMemo(() => {
    const activeCount = playbooks.filter((item) => item.is_active).length;
    const totalPnl = playbooks.reduce(
      (sum, item) => sum + (item.stats?.totalPnl ?? 0),
      0,
    );
    const avgWinRate =
      playbooks.length > 0
        ? playbooks.reduce((sum, item) => sum + (item.stats?.winRate ?? 0), 0) /
          playbooks.length
        : 0;

    return [
      {
        label: "Total Playbooks",
        value: String(playbooks.length),
        tone: "default" as const,
      },
      {
        label: "Active",
        value: String(activeCount),
        tone: "profit" as const,
      },
      {
        label: "Avg Win Rate",
        value: `${avgWinRate.toFixed(1)}%`,
        tone: "default" as const,
      },
      {
        label: "Total P&L",
        value: `${totalPnl >= 0 ? "+" : "-"}$${Math.abs(totalPnl).toLocaleString()}`,
        tone: totalPnl >= 0 ? ("profit" as const) : ("loss" as const),
      },
    ];
  }, [playbooks]);

  const filtered = useMemo(
    () =>
      playbooks.filter(
        (pb) =>
          pb.name.toLowerCase().includes(search.toLowerCase()) ||
          (pb.description ?? "").toLowerCase().includes(search.toLowerCase()),
      ),
    [playbooks, search],
  );

  if (!authLoading && !isConfigured) {
    return (
      <AppPanel className="mt-8 max-w-xl">
        <h2 className="headline-md">Supabase Not Configured</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your Supabase credentials to enable playbooks.
        </p>
      </AppPanel>
    );
  }

  if (!authLoading && !user) {
    return (
      <AppPanel className="mt-8 max-w-xl">
        <h2 className="headline-md">Login Required</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to view and manage your strategy playbooks.
        </p>
        <Button asChild className="mt-4">
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </AppPanel>
    );
  }

  return (
    <div className="page-root page-sections">
      <AppPageHeader
        eyebrow="Strategies"
        title="Playbooks"
        description="Document repeatable setups and track their execution outcomes."
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={loadPlaybooks}
              title="Refresh playbooks"
              className="border-border bg-card hover:bg-accent"
              aria-label="Refresh playbooks"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>

            <Dialog
              open={isNewPlaybookOpen}
              onOpenChange={setIsNewPlaybookOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  New Playbook
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
                <form onSubmit={handleCreate}>
                  <DialogHeader>
                    <DialogTitle>Create Playbook</DialogTitle>
                    <DialogDescription>
                      Define the setup details and execution criteria for this
                      strategy.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="playbook-name">Playbook Name</Label>
                      <Input
                        id="playbook-name"
                        placeholder="e.g. London session breakout"
                        value={formData.name}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="playbook-description">Description</Label>
                      <Textarea
                        id="playbook-description"
                        placeholder="Briefly describe market context and setup intent."
                        rows={3}
                        value={formData.description}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="playbook-rules">
                        Rules (one per line)
                      </Label>
                      <Textarea
                        id="playbook-rules"
                        placeholder="Liquidity sweep confirmed&#10;Break of structure&#10;Risk <= 1%"
                        rows={5}
                        value={formData.rules}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            rules: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsNewPlaybookOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
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
          </>
        }
      />

      {error && (
        <div className="rounded-md border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <AppMetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone={card.tone}
          />
        ))}
      </section>

      {/* ─── Search bar ─── */}
      {!loading && playbooks.length > 0 && (
        <div className="relative w-64">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-tertiary)" }}
          >
            <IconSearch size={14} strokeWidth={1.8} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search playbooks…"
            className="w-full rounded-[var(--radius-default)] py-2 pl-9 pr-4 text-sm"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>
      )}

      {loading && (
        <AppPanel className="flex min-h-[180px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </AppPanel>
      )}

      {!loading && playbooks.length === 0 && (
        <AppPanel className="py-14">
          <BookOpen className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No playbooks yet. Start by creating your first strategy template.
          </p>
          <Button onClick={() => setIsNewPlaybookOpen(true)} className="mt-5">
            <Plus className="h-4 w-4" />
            Create First Playbook
          </Button>
        </AppPanel>
      )}

      {!loading && playbooks.length > 0 && search && filtered.length === 0 && (
        <NoDataEmpty />
      )}

      {!loading && filtered.length > 0 && (
        <motion.section
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {filtered.map((playbook) => {
            const pnl = playbook.stats?.totalPnl ?? 0;
            const winRate = playbook.stats?.winRate ?? 0;
            const totalTrades = playbook.stats?.totalTrades ?? 0;
            const avgR = playbook.stats?.avgRMultiple ?? 0;
            const ruleCount =
              Array.isArray(playbook.rules) && playbook.rules.length > 0
                ? playbook.rules.length
                : 0;

            return (
              <motion.div
                key={playbook.id}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
                }}
                whileHover={{ y: -3, transition: { duration: 0.15 } }}
                className="h-full"
              >
                <article className="surface card-glow p-5 h-full flex flex-col">
                  {/* Gradient top stripe */}
                  <div
                    className="h-[3px] rounded-t-[var(--radius-xl)] -mx-5 -mt-5 mb-5 shrink-0"
                    style={{
                      background:
                        pnl >= 0
                          ? "linear-gradient(90deg, var(--profit-primary), rgba(78,203,6,0.2))"
                          : "linear-gradient(90deg, var(--loss-primary), rgba(255,68,85,0.2))",
                    }}
                  />

                  {/* Header */}
                  <header className="mb-3 flex items-start justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="rounded-md p-2 shrink-0"
                        style={
                          pnl >= 0
                            ? {
                                background: "var(--profit-bg)",
                                color: "var(--profit-primary)",
                              }
                            : {
                                background: "var(--loss-bg)",
                                color: "var(--loss-primary)",
                              }
                        }
                      >
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">
                          {playbook.name}
                        </h3>
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={
                            playbook.is_active
                              ? {
                                  background: "rgba(78,203,6,0.15)",
                                  color: "var(--profit-primary)",
                                }
                              : {
                                  background: "var(--surface-elevated)",
                                  color: "var(--text-tertiary)",
                                }
                          }
                        >
                          {playbook.is_active ? "● Active" : "○ Paused"}
                        </span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded-md p-2 transition-colors hover:bg-[var(--surface-elevated)] shrink-0"
                          style={{ color: "var(--text-tertiary)" }}
                          aria-label={`Open actions for ${playbook.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(playbook.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(playbook.id)}
                        >
                          {playbook.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(playbook.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </header>

                  <p
                    className="mb-4 line-clamp-2 text-sm shrink-0"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {playbook.description || "No description provided."}
                  </p>

                  {/* Win rate bar */}
                  <div className="mb-4 space-y-1.5 shrink-0">
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "var(--text-tertiary)" }}>
                        Win Rate
                      </span>
                      <span className="font-semibold mono">
                        {winRate.toFixed(1)}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "var(--surface-elevated)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(winRate, 100)}%`,
                          background:
                            winRate >= 50
                              ? "var(--profit-primary)"
                              : "var(--loss-primary)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Stat grid */}
                  <div
                    className="mb-4 grid grid-cols-3 gap-2 rounded-[var(--radius-md)] p-3 text-center shrink-0"
                    style={{
                      background: "var(--surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div>
                      <p className="text-xl font-bold mono">{totalTrades}</p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Trades
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-bold mono">
                        {avgR.toFixed(1)}R
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Avg R
                      </p>
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-xl font-bold mono",
                          pnl >= 0 ? "profit" : "loss",
                        )}
                      >
                        {pnl >= 0 ? "+" : "-"}${Math.abs(pnl).toLocaleString()}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        P&L
                      </p>
                    </div>
                  </div>

                  {/* Rule count badge */}
                  <div className="mb-4 shrink-0">
                    {ruleCount > 0 ? (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--surface-elevated)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {ruleCount} rules
                      </span>
                    ) : (
                      <span
                        style={{
                          color: "var(--text-tertiary)",
                          fontSize: "0.7rem",
                        }}
                      >
                        No rules added
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="mt-auto flex w-full items-center justify-center gap-2 pt-3 text-sm transition-colors hover:text-[var(--accent-primary)]"
                    style={{
                      borderTop: "1px solid var(--border-subtle)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    View details
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </article>
              </motion.div>
            );
          })}
        </motion.section>
      )}
    </div>
  );
}
