"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  WandSparkles,
} from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { Button } from "@/components/ui/button";
import {
  AppPanel,
  AppPageHeader,
  AppPanelEmptyState,
} from "@/components/ui/page-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";
import {
  createPlaybook,
  deletePlaybook,
  duplicatePlaybook,
  getAllPlaybooksWithStats,
  togglePlaybookActive,
  type Playbook,
} from "@/lib/api/client/playbooks";
import {
  generateStrategyWithAI,
  type GeneratedStrategy,
  type StrategyBuilderMessage,
} from "@/lib/api/client/ai";
import {
  EMPTY_PLAYBOOK_STATS,
  normalizePlaybook,
  normalizePlaybookScope,
  type PlaybookCardData,
} from "@/lib/playbooks/view-model";
import { StrategyLibraryRail } from "@/components/strategies/strategy-library-rail";
import { StrategyDetailView } from "@/components/strategies/strategy-detail-view";
import { StrategyBuilderView } from "@/components/strategies/strategy-builder-view";
import { PlaybookManageDialog } from "@/components/playbooks/playbook-manage-dialog";

function buildIntroMessage(): StrategyBuilderMessage {
  return {
    id: "intro",
    role: "assistant",
    content:
      "Describe the setup you want to build. Include market type, trigger, invalidation, and the risk conditions that must be present.",
  };
}

export default function StrategiesPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId } = usePropAccount();

  const [playbooks, setPlaybooks] = useState<PlaybookCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(
    null,
  );
  const [managedPlaybookId, setManagedPlaybookId] = useState<string | null>(
    null,
  );

  const [isCreating, setIsCreating] = useState(false);
  const [messages, setMessages] = useState<StrategyBuilderMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [generated, setGenerated] = useState<GeneratedStrategy | null>(null);
  const [saving, setSaving] = useState(false);

  const deferredSearch = useDeferredValue(search);

  const resetBuilder = useCallback(() => {
    setMessages([buildIntroMessage()]);
    setGenerated(null);
    setInput("");
  }, []);

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
      const nextPlaybooks = stats.map((item) =>
        normalizePlaybook({
          ...item.playbook,
          stats: {
            totalTrades: item.totalTrades,
            winRate: item.winRate,
            avgRMultiple: item.avgRMultiple,
            totalPnl: item.totalPnl,
          },
        }),
      );

      setPlaybooks(nextPlaybooks);
      setSelectedPlaybookId((current) => {
        if (current && nextPlaybooks.some((playbook) => playbook.id === current)) {
          return current;
        }

        return nextPlaybooks[0]?.id ?? null;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load strategies.",
      );
    } finally {
      setLoading(false);
    }
  }, [isConfigured, selectedAccountId, user]);

  useEffect(() => {
    if (!authLoading) {
      void loadPlaybooks();
    }
  }, [authLoading, loadPlaybooks]);

  const filteredPlaybooks = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) {
      return playbooks;
    }

    return playbooks.filter((playbook) =>
      [playbook.name, playbook.description ?? "", playbook.rules.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [deferredSearch, playbooks]);

  const displayedPlaybook = useMemo(() => {
    if (filteredPlaybooks.length === 0) {
      return null;
    }

    return (
      filteredPlaybooks.find((playbook) => playbook.id === selectedPlaybookId) ??
      filteredPlaybooks[0]
    );
  }, [filteredPlaybooks, selectedPlaybookId]);

  useEffect(() => {
    if (isCreating || filteredPlaybooks.length === 0) {
      return;
    }

    if (
      !selectedPlaybookId ||
      !filteredPlaybooks.some((playbook) => playbook.id === selectedPlaybookId)
    ) {
      setSelectedPlaybookId(filteredPlaybooks[0].id);
    }
  }, [filteredPlaybooks, isCreating, selectedPlaybookId]);

  function startCreating() {
    setError(null);
    resetBuilder();
    setIsCreating(true);
  }

  function backToLibrary() {
    setIsCreating(false);
  }

  async function send() {
    if (!input.trim() || thinking) return;

    const outgoingMessage: StrategyBuilderMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };
    const nextMessages = [...messages, outgoingMessage];

    setMessages(nextMessages);
    setInput("");
    setThinking(true);
    setError(null);

    try {
      const strategy = await generateStrategyWithAI({
        prompt: outgoingMessage.content,
        messages: nextMessages,
        existingStrategies: playbooks.map((playbook) => playbook.name),
      });

      setGenerated(strategy);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: `Generated "${strategy.name}" with ${strategy.rules.length} rules. Review the draft on the right before saving it to your library.`,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to generate strategy.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: message,
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function saveGeneratedStrategy() {
    if (!generated) return;

    try {
      setSaving(true);
      setError(null);

      const created = await createPlaybook({
        name: generated.name,
        description: generated.description,
        rules: generated.rules.map((rule) => rule.text),
        isActive: true,
      });

      const normalized = normalizePlaybook({
        ...created,
        stats: EMPTY_PLAYBOOK_STATS,
      });

      setPlaybooks((prev) => [normalized, ...prev]);
      setSelectedPlaybookId(normalized.id);
      setIsCreating(false);
      resetBuilder();
      setSearch("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save strategy.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(playbookId: string) {
    if (!confirm("Delete this strategy? This action cannot be undone.")) {
      return;
    }

    try {
      await deletePlaybook(playbookId);

      setPlaybooks((prev) => {
        const next = prev.filter((playbook) => playbook.id !== playbookId);
        setSelectedPlaybookId((current) =>
          current === playbookId ? next[0]?.id ?? null : current,
        );
        return next;
      });

      if (managedPlaybookId === playbookId) {
        setManagedPlaybookId(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete strategy.",
      );
    }
  }

  async function handleDuplicate(playbookId: string) {
    try {
      const duplicated = await duplicatePlaybook(playbookId);
      const normalized = normalizePlaybook({
        ...duplicated,
        stats: EMPTY_PLAYBOOK_STATS,
      });

      setPlaybooks((prev) => [normalized, ...prev]);
      setSelectedPlaybookId(normalized.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to duplicate strategy.",
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
        err instanceof Error
          ? err.message
          : "Failed to update strategy status.",
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

  if (!authLoading && !isConfigured) {
    return (
      <div className="page-root page-sections">
        <AppPanelEmptyState
          className="max-w-xl"
          title="Supabase Not Configured"
          description="Add your Supabase credentials to generate and manage strategy playbooks."
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
          description="Sign in to generate strategies and manage your playbook library."
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
    <div className="page-root grid min-h-[calc(100vh-9rem)] grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <StrategyLibraryRail
        playbooks={filteredPlaybooks}
        totalCount={playbooks.length}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        onClearSearch={() => setSearch("")}
        onStartCreating={startCreating}
        selectedPlaybookId={displayedPlaybook?.id ?? null}
        onSelect={(playbookId) => {
          setSelectedPlaybookId(playbookId);
          setIsCreating(false);
        }}
      />

      <main className="min-w-0 space-y-4">
        <AppPageHeader
          eyebrow={isCreating ? "AI Assistant" : "Strategies"}
          title={
            isCreating
              ? "Strategy Builder"
              : displayedPlaybook?.name || "Strategy Library"
          }
          description={
            isCreating
              ? "Describe the setup, let the assistant draft the strategy, then save it into your library once the rules are solid."
              : displayedPlaybook?.description ||
                "Review strategy performance, edit execution rules, and maintain the active playbook catalog."
          }
          actions={
            <>
              {isCreating ? (
                <Button variant="outline" onClick={backToLibrary}>
                  Back to Library
                </Button>
              ) : (
                <Button onClick={startCreating}>
                  <WandSparkles className="h-4 w-4" />
                  Build with AI
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => void loadPlaybooks()}
                aria-label="Refresh strategies"
                title="Refresh strategies"
              >
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              </Button>
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

        {isCreating ? (
          <StrategyBuilderView
            messages={messages}
            input={input}
            onInputChange={setInput}
            onSend={send}
            thinking={thinking}
            generated={generated}
            saving={saving}
            onSave={saveGeneratedStrategy}
          />
        ) : loading ? (
          <AppPanel className="flex min-h-[320px] items-center justify-center">
            <Loader2
              className="h-6 w-6 animate-spin"
              style={{ color: "var(--text-tertiary)" }}
            />
          </AppPanel>
        ) : playbooks.length === 0 ? (
          <AppPanelEmptyState
            title="No strategies in your library yet"
            description="Use the AI builder to create the first strategy, then refine it into a repeatable playbook."
            action={
              <Button onClick={startCreating}>
                <WandSparkles className="h-4 w-4" />
                Create with AI
              </Button>
            }
          />
        ) : filteredPlaybooks.length === 0 ? (
          <AppPanelEmptyState
            title="No strategies match your search"
            description="Clear the current search to bring your full strategy library back into view."
            action={
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear Search
              </Button>
            }
          />
        ) : (
          <StrategyDetailView
            playbook={displayedPlaybook}
            onManage={setManagedPlaybookId}
            onDuplicate={handleDuplicate}
            onToggleActive={handleToggleActive}
            onDelete={handleDelete}
          />
        )}
      </main>

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
