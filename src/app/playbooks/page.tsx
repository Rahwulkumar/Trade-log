"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";

import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { Button } from "@/components/ui/button";
import {
  AppMetricCard,
  AppPageHeader,
  AppPanel,
  AppPanelEmptyState,
  SectionHeader,
} from "@/components/ui/page-primitives";
import {
  ChoiceChip,
  ControlSurface,
  FieldGroup,
} from "@/components/ui/control-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createPlaybook,
  deletePlaybook,
  duplicatePlaybook,
  getAllPlaybooksWithStats,
  togglePlaybookActive,
  type Playbook,
} from "@/lib/api/client/playbooks";
import { cn } from "@/lib/utils";
import {
  PlaybookCard,
} from "@/components/playbooks/playbook-card";
import { PlaybookManageDialog } from "@/components/playbooks/playbook-manage-dialog";
import {
  EMPTY_PLAYBOOK_STATS,
  normalizePlaybook,
  normalizePlaybookScope,
  type PlaybookCardData,
} from "@/lib/playbooks/view-model";

type StatusFilter = "all" | "active" | "paused";

export default function PlaybooksPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId } = usePropAccount();

  const [playbooks, setPlaybooks] = useState<PlaybookCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewPlaybookOpen, setIsNewPlaybookOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managedPlaybookId, setManagedPlaybookId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

      const stats = await getAllPlaybooksWithStats(
        normalizePlaybookScope(selectedAccountId),
      );

      setPlaybooks(
        stats.map((item) =>
          normalizePlaybook({
            ...item.playbook,
            stats: {
              totalTrades: item.totalTrades,
              winRate: item.winRate,
              avgRMultiple: item.avgRMultiple,
              totalPnl: item.totalPnl,
            },
          }),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load playbooks");
    } finally {
      setLoading(false);
    }
  }, [isConfigured, selectedAccountId, user]);

  useEffect(() => {
    if (!authLoading) {
      void loadPlaybooks();
    }
  }, [authLoading, loadPlaybooks]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData.name.trim()) {
      setError("Please enter a playbook name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createPlaybook({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        rules: formData.rules
          ? formData.rules
              .split("\n")
              .map((rule) => rule.trim())
              .filter(Boolean)
          : null,
        isActive: true,
      });

      setPlaybooks((prev) => [
        normalizePlaybook({ ...created, stats: EMPTY_PLAYBOOK_STATS }),
        ...prev,
      ]);
      setFormData({ name: "", description: "", rules: "" });
      setIsNewPlaybookOpen(false);
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
      setPlaybooks((prev) =>
        prev.filter((playbook) => playbook.id !== playbookId),
      );
      if (managedPlaybookId === playbookId) {
        setManagedPlaybookId(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete playbook",
      );
    }
  }

  async function handleDuplicate(playbookId: string) {
    try {
      const duplicated = await duplicatePlaybook(playbookId);
      setPlaybooks((prev) => [
        normalizePlaybook({ ...duplicated, stats: EMPTY_PLAYBOOK_STATS }),
        ...prev,
      ]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to duplicate playbook",
      );
    }
  }

  async function handleToggleActive(playbookId: string) {
    try {
      const updated = await togglePlaybookActive(playbookId);
      setPlaybooks((prev) =>
        prev.map((playbook) =>
          playbook.id === playbookId
            ? normalizePlaybook({
                ...updated,
                stats: playbook.stats,
              })
            : playbook,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update playbook status",
      );
    }
  }

  function handleManageSaved(updated: Playbook) {
    setPlaybooks((prev) =>
      prev.map((playbook) =>
        playbook.id === updated.id
          ? normalizePlaybook({
              ...updated,
              stats: playbook.stats,
            })
          : playbook,
      ),
    );
  }

  const summaryCards = useMemo(() => {
    const activeCount = playbooks.filter((item) => item.isActive).length;
    const totalPnl = playbooks.reduce(
      (sum, item) => sum + item.stats.totalPnl,
      0,
    );
    const avgWinRate =
      playbooks.length > 0
        ? playbooks.reduce((sum, item) => sum + item.stats.winRate, 0) /
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
      playbooks.filter((playbook) => {
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" ? playbook.isActive : !playbook.isActive);

        const haystack = [
          playbook.name,
          playbook.description ?? "",
          playbook.rules.join(" "),
        ]
          .join(" ")
          .toLowerCase();

        return matchesStatus && haystack.includes(search.toLowerCase());
      }),
    [playbooks, search, statusFilter],
  );

  if (!authLoading && !isConfigured) {
    return (
      <div className="page-root page-sections">
        <AppPanelEmptyState
          className="max-w-xl"
          title="Supabase Not Configured"
          description="Add your Supabase credentials to enable playbooks."
          minHeight={180}
        />
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="page-root page-sections">
        <AppPanelEmptyState
          className="max-w-xl"
          title="Login Required"
          description="Sign in to view and manage your strategy playbooks."
          action={
            <Button asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          }
          minHeight={200}
        />
      </div>
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
              onClick={() => void loadPlaybooks()}
              title="Refresh playbooks"
              className="border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
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
                        placeholder={"Liquidity sweep confirmed\nBreak of structure\nRisk <= 1%"}
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

      {error ? (
        <InsetPanel
          tone="loss"
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: "var(--loss-primary)" }}
            />
            <p className="text-sm" style={{ color: "var(--loss-primary)" }}>
              {error}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </InsetPanel>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <AppMetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone={card.tone}
          />
        ))}
      </section>

      {!loading && playbooks.length > 0 ? (
        <ControlSurface className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <FieldGroup
              label="Search library"
              meta={
                <span
                  className="text-[0.72rem]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {filtered.length} result{filtered.length === 1 ? "" : "s"}
                </span>
              }
            >
              <div className="relative max-w-xl">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: "var(--text-tertiary)" }}
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search playbooks..."
                  className="pl-9"
                />
              </div>
            </FieldGroup>

            <FieldGroup label="Status">
              <div className="flex flex-wrap gap-2">
                <ChoiceChip
                  active={statusFilter === "all"}
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </ChoiceChip>
                <ChoiceChip
                  active={statusFilter === "active"}
                  onClick={() => setStatusFilter("active")}
                  activeColor="var(--profit-primary)"
                  activeBackground="var(--profit-bg)"
                  activeBorderColor="var(--profit-primary)"
                >
                  Active
                </ChoiceChip>
                <ChoiceChip
                  active={statusFilter === "paused"}
                  onClick={() => setStatusFilter("paused")}
                  activeColor="var(--warning-primary)"
                  activeBackground="var(--warning-bg)"
                  activeBorderColor="var(--warning-primary)"
                >
                  Paused
                </ChoiceChip>
              </div>
            </FieldGroup>
          </div>
        </ControlSurface>
      ) : null}

      {loading ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <AppPanel key={index} className="flex h-full flex-col gap-4 p-5">
              <div className="skeleton h-10 rounded-[var(--radius-md)]" />
              <div className="skeleton h-20 rounded-[var(--radius-md)]" />
              <div className="skeleton h-28 rounded-[var(--radius-md)]" />
              <div className="mt-auto flex justify-end">
                <div className="skeleton h-8 w-28 rounded-[var(--radius-md)]" />
              </div>
            </AppPanel>
          ))}
        </section>
      ) : null}

      {!loading && playbooks.length === 0 ? (
        <AppPanelEmptyState
          title="No playbooks yet"
          description="Start by creating your first strategy template, then track how it performs across accounts."
          action={
            <Button onClick={() => setIsNewPlaybookOpen(true)}>
              <Plus className="h-4 w-4" />
              Create First Playbook
            </Button>
          }
        />
      ) : null}

      {!loading && playbooks.length > 0 && filtered.length === 0 ? (
        <AppPanelEmptyState
          title="No playbooks match these filters"
          description="Try a broader search or clear the status filter to bring the full library back into view."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : null}

      {!loading && filtered.length > 0 ? (
        <>
          <SectionHeader
            title="Playbook Library"
            subtitle="Review the strategy catalog, monitor performance, and keep each template current."
          />

          <motion.section
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.06 } },
            }}
          >
            {filtered.map((playbook) => (
              <motion.div
                key={playbook.id}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.25 },
                  },
                }}
                className="h-full"
              >
                <PlaybookCard
                  playbook={playbook}
                  onManage={setManagedPlaybookId}
                  onDuplicate={handleDuplicate}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              </motion.div>
            ))}
          </motion.section>
        </>
      ) : null}

      <PlaybookManageDialog
        playbookId={managedPlaybookId}
        open={managedPlaybookId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setManagedPlaybookId(null);
          }
        }}
        onSaved={handleManageSaved}
      />
    </div>
  );
}
