"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Copy,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";
import {
  createPlaybook,
  deletePlaybook,
  duplicatePlaybook,
  getAllPlaybooksWithStats,
  togglePlaybookActive,
} from "@/lib/api/playbooks";
import type { Playbook } from "@/lib/supabase/types";
import { AppPageHeader, AppPanel } from "@/components/ui/page-primitives";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface GeneratedStrategy {
  name: string;
  description: string;
  rules: { id: string; text: string; required: boolean }[];
}

interface PlaybookWithStats extends Playbook {
  stats?: {
    totalTrades: number;
    winRate: number;
    avgRMultiple: number;
    totalPnl: number;
  };
}

export default function StrategiesPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();

  const [playbooks, setPlaybooks] = useState<PlaybookWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [generated, setGenerated] = useState<GeneratedStrategy | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(
    null,
  );
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && isConfigured && user) {
      loadPlaybooks();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isConfigured, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadPlaybooks() {
    setLoading(true);
    try {
      const stats = await getAllPlaybooksWithStats();
      const playbooksWithStats = stats.map((item) => ({
        ...item.playbook,
        stats: {
          totalTrades: item.totalTrades,
          winRate: item.winRate,
          avgRMultiple: item.avgRMultiple,
          totalPnl: item.totalPnl,
        },
      }));
      setPlaybooks(playbooksWithStats);
      if (!selectedPlaybookId && playbooksWithStats.length > 0) {
        setSelectedPlaybookId(playbooksWithStats[0].id);
      }
    } catch (error) {
      console.error("Failed to load strategies", error);
    } finally {
      setLoading(false);
    }
  }

  function startCreating() {
    setMessages([
      {
        id: "intro",
        role: "assistant",
        content:
          "Describe the setup you want to build. Include market type, trigger, invalidation, and risk constraints.",
      },
    ]);
    setGenerated(null);
    setInput("");
    setIsCreating(true);
  }

  async function send() {
    if (!input.trim() || thinking) return;

    const outgoingMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };
    const nextMessages = [...messages, outgoingMessage];

    setMessages(nextMessages);
    setInput("");
    setThinking(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-strategy",
          prompt: outgoingMessage.content,
          messages: nextMessages,
        }),
      });
      const data = await response.json();

      if (data.success && data.strategy) {
        setGenerated(data.strategy);
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            content: `Generated "${data.strategy.name}" with ${data.strategy.rules.length} rules. Review and save when ready.`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            content:
              data.error || "Unable to generate strategy from that prompt.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: "Request failed. Please retry.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function saveGeneratedStrategy() {
    if (!generated) return;
    setSaving(true);
    try {
      await createPlaybook({
        name: generated.name,
        description: generated.description,
        rules: generated.rules.map((rule) => rule.text),
        is_active: true,
      });
      setIsCreating(false);
      setGenerated(null);
      await loadPlaybooks();
    } finally {
      setSaving(false);
    }
  }

  async function remove(playbookId: string) {
    if (!confirm("Delete this strategy?")) return;
    try {
      await deletePlaybook(playbookId);
      await loadPlaybooks();
    } catch (error) {
      console.error("Failed to delete strategy", error);
    }
  }

  async function handleDuplicate(playbookId: string) {
    try {
      await duplicatePlaybook(playbookId);
      await loadPlaybooks();
    } catch (error) {
      console.error("Failed to duplicate strategy", error);
    }
  }

  async function handleToggleActive(playbookId: string) {
    try {
      await togglePlaybookActive(playbookId);
      await loadPlaybooks();
    } catch (error) {
      console.error("Failed to update strategy status", error);
    }
  }


  if (!authLoading && (!isConfigured || !user)) {
    return (
      <AppPanel className="mx-auto mt-8 max-w-xl text-center">
        <h2 className="headline-md">Login Required</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to generate and manage strategy playbooks.
        </p>
        <Button asChild className="mt-4">
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </AppPanel>
    );
  }

  return (
    <div className="p-4 sm:p-5 lg:p-6 grid min-h-[calc(100vh-9rem)] gap-4 grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] max-w-[1280px]">
      <aside className="surface flex min-h-0 flex-col p-3">
        <Button onClick={startCreating} className="mb-3 justify-start">
          <Plus className="mr-2 h-4 w-4" />
          New Strategy
        </Button>

        <div className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Library
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : playbooks.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              No strategies yet.
            </div>
          ) : (
            playbooks.map((playbook) => (
              <button
                key={playbook.id}
                type="button"
                onClick={() => setSelectedPlaybookId(playbook.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-sm transition-colors",
                  selectedPlaybookId === playbook.id
                    ? "border-accent-primary/40 bg-accent/40"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-accent/30 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    playbook.is_active
                      ? "bg-[var(--profit-primary)]"
                      : "bg-muted-foreground",
                  )}
                />
                <span className="truncate">{playbook.name}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="min-w-0 space-y-4">
        {isCreating ? (
          <>
            <AppPageHeader
              eyebrow="AI Assistant"
              title="Strategy Builder"
              description="Iterate with the assistant, then save the generated strategy into your library."
              actions={
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Back to Library
                </Button>
              }
            />

            <AppPanel className="flex min-h-[360px] flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-start gap-3",
                      message.role === "user" && "justify-end",
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="rounded-md bg-accent p-2 text-accent-primary">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-md border p-3 text-sm",
                        message.role === "assistant"
                          ? "border-border-subtle bg-muted/20"
                          : "border-accent-primary/35 bg-accent/40",
                      )}
                    >
                      {message.content}
                    </div>
                    {message.role === "user" && (
                      <div className="rounded-md border border-border-subtle bg-card p-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {thinking && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Assistant is generating strategy structure...
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="mt-4 flex gap-2 border-t border-border-subtle pt-4">
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Describe your strategy setup..."
                  disabled={thinking}
                />
                <Button
                  type="button"
                  onClick={send}
                  disabled={!input.trim() || thinking}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </AppPanel>

            {generated && (
              <AppPanel>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-label mb-1">Generated Strategy</p>
                    <h3 className="headline-md">{generated.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {generated.description}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {generated.rules.length} rules prepared
                    </p>
                  </div>
                  <Button onClick={saveGeneratedStrategy} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save Strategy"
                    )}
                  </Button>
                </div>
              </AppPanel>
            )}
          </>
        ) : (
          <>
            <AppPageHeader
              eyebrow="Strategies"
              title="Strategy Library"
              description="Review strategy performance and maintain the playbook catalog."
              actions={
                <Button
                  variant="outline"
                  size="icon"
                  onClick={loadPlaybooks}
                  title="Refresh strategies"
                  aria-label="Refresh strategies"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", loading && "animate-spin")}
                  />
                </Button>
              }
            />

            {loading ? (
              <AppPanel className="flex min-h-[220px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </AppPanel>
            ) : playbooks.length === 0 ? (
              <AppPanel className="py-14 text-center">
                <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No strategies in your library yet.
                </p>
                <Button onClick={startCreating} className="mt-5">
                  <Plus className="h-4 w-4" />
                  Create with AI
                </Button>
              </AppPanel>
            ) : (
              <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {playbooks.map((playbook) => {
                  const pnl = playbook.stats?.totalPnl ?? 0;
                  const winRate = playbook.stats?.winRate ?? 0;
                  const trades = playbook.stats?.totalTrades ?? 0;
                  const avgR = playbook.stats?.avgRMultiple ?? 0;
                  const ruleCount = Array.isArray(playbook.rules) ? playbook.rules.length : 0;

                  return (
                    <article
                      key={playbook.id}
                      className="surface card-glow p-5 flex flex-col"
                    >
                      {/* Gradient top stripe */}
                      <div
                        className="h-[3px] rounded-t-[var(--radius-xl)] -mx-5 -mt-5 mb-5 shrink-0"
                        style={{
                          background: pnl >= 0
                            ? "linear-gradient(90deg, var(--profit-primary), rgba(78,203,6,0.2))"
                            : "linear-gradient(90deg, var(--loss-primary), rgba(255,68,85,0.2))",
                        }}
                      />

                      {/* Header */}
                      <header className="mb-3 flex items-start justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="rounded-md p-2 shrink-0"
                            style={pnl >= 0
                              ? { background: "var(--profit-bg)", color: "var(--profit-primary)" }
                              : { background: "var(--loss-bg)", color: "var(--loss-primary)" }}
                          >
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">{playbook.name}</h3>
                            <span
                              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                              style={playbook.is_active
                                ? { background: "rgba(78,203,6,0.15)", color: "var(--profit-primary)" }
                                : { background: "var(--surface-elevated)", color: "var(--text-tertiary)" }}
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
                            <DropdownMenuItem onClick={() => handleDuplicate(playbook.id)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(playbook.id)}>
                              {playbook.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => remove(playbook.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </header>

                      <p className="mb-4 line-clamp-2 text-sm shrink-0" style={{ color: "var(--text-tertiary)" }}>
                        {playbook.description || "No description provided."}
                      </p>

                      {/* Win rate bar */}
                      <div className="mb-4 space-y-1.5 shrink-0">
                        <div className="flex justify-between text-xs">
                          <span style={{ color: "var(--text-tertiary)" }}>Win Rate</span>
                          <span className="font-semibold mono">{winRate.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-elevated)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(winRate, 100)}%`,
                              background: winRate >= 50 ? "var(--profit-primary)" : "var(--loss-primary)",
                            }}
                          />
                        </div>
                      </div>

                      {/* Stat grid */}
                      <div
                        className="mb-4 grid grid-cols-3 gap-2 rounded-[var(--radius-md)] p-3 text-center shrink-0"
                        style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)" }}
                      >
                        <div>
                          <p className="text-xl font-bold mono">{trades}</p>
                          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Trades</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold mono">{avgR.toFixed(1)}R</p>
                          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Avg R</p>
                        </div>
                        <div>
                          <p className={cn("text-xl font-bold mono", pnl >= 0 ? "profit" : "loss")}>
                            {pnl >= 0 ? "+" : "-"}${Math.abs(pnl).toLocaleString()}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>P&L</p>
                        </div>
                      </div>

                      {/* Rule count */}
                      <div className="mb-4 shrink-0">
                        {ruleCount > 0
                          ? <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}>
                              {ruleCount} rules
                            </span>
                          : <span style={{ color: "var(--text-tertiary)", fontSize: "0.7rem" }}>No rules added</span>}
                      </div>

                      <button
                        type="button"
                        className="mt-auto flex w-full items-center justify-center gap-2 pt-3 text-sm transition-colors hover:text-[var(--accent-primary)]"
                        style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}
                      >
                        View Details
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
