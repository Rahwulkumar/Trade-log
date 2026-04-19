"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import {
  TradeReviewRail,
  type TradeReviewRailItem,
  type TradeReviewStatus,
} from "@/components/journal/trade-review-rail";
import { TradeReviewDocument } from "@/components/journal/trade-review-document";
import {
  AppPanel,
  AppPanelEmptyState,
} from "@/components/ui/page-primitives";
import { WidgetEmptyState } from "@/components/ui/surface-primitives";
import { Button } from "@/components/ui/button";
import { LoadingJournalWorkspace } from "@/components/ui/loading";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  buildJournalTradeGroups,
  buildJournalTradeRecords,
  type JournalTradeGroupRecord,
} from "@/domain/journal-review-groups";
import {
  getPlaybooks,
  type Playbook,
} from "@/lib/api/client/playbooks";
import {
  getJournalTemplates,
  getMistakeDefinitions,
  getRuleSets,
  getSetupDefinitions,
} from "@/lib/api/client/journal-structure";
import { getTradesStrict } from "@/lib/api/client/trades";
import type {
  JournalTemplate,
  MistakeDefinition,
  SetupDefinition,
  Trade,
} from "@/lib/db/schema";
import type { RuleSetWithItems } from "@/lib/rulebooks/types";

type StatusFilter = "all" | "pending" | "draft" | "complete" | "trivial";

function withTradeQuery(
  pathname: string,
  searchParams: URLSearchParams,
  tradeId: string | null,
): string {
  const params = new URLSearchParams(searchParams.toString());
  if (tradeId) {
    params.set("trade", tradeId);
  } else {
    params.delete("trade");
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function JournalPage() {
  const { user, profile } = useAuth();
  const { propAccounts, selectedAccountId } = usePropAccount();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [setupDefinitions, setSetupDefinitions] = useState<SetupDefinition[]>([]);
  const [mistakeDefinitions, setMistakeDefinitions] = useState<MistakeDefinition[]>([]);
  const [journalTemplates, setJournalTemplates] = useState<JournalTemplate[]>([]);
  const [ruleSets, setRuleSets] = useState<RuleSetWithItems[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [browserOpen, setBrowserOpen] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const currentUserId = user?.id ?? null;
  const deferredSearch = useDeferredValue(search);
  const tradeParam = searchParams.get("trade");

  const loadTrades = useCallback(async () => {
    if (!currentUserId) {
      return [] as Trade[];
    }

    return getTradesStrict({
      status: "closed",
      propAccountId: selectedAccountId ?? undefined,
      sortBy: "exitDate",
      sortOrder: "desc",
      limit: 400,
    });
  }, [currentUserId, selectedAccountId]);

  const handleTradeSaved = useCallback((savedTrade: Trade) => {
    setTrades((currentTrades) =>
      currentTrades.map((trade) =>
        trade.id === savedTrade.id ? savedTrade : trade,
      ),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!currentUserId) {
        if (!cancelled) {
          setTrades([]);
          setLoadError(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
      }

      try {
        const rows = await loadTrades();

        if (!cancelled) {
          setTrades(rows);
          setLoadError(null);
          setLoading(false);
        }
      } catch (loadTradesError) {
        if (!cancelled) {
          setTrades([]);
          setLoadError(
            loadTradesError instanceof Error
              ? loadTradesError.message
              : "The journal could not load your trades right now.",
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, loadTrades, reloadNonce]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!currentUserId) {
        if (!cancelled) {
          setPlaybooks([]);
          setSetupDefinitions([]);
          setMistakeDefinitions([]);
          setJournalTemplates([]);
          setRuleSets([]);
        }
        return;
      }

      try {
        const [playbookRows, setupRows, mistakeRows, templateRows, ruleSetRows] =
          await Promise.all([
            getPlaybooks(),
            getSetupDefinitions({ activeOnly: true }),
            getMistakeDefinitions({ activeOnly: true }),
            getJournalTemplates({ activeOnly: true }),
            getRuleSets({ activeOnly: true }),
          ]);
        if (!cancelled) {
          setPlaybooks(playbookRows);
          setSetupDefinitions(setupRows);
          setMistakeDefinitions(mistakeRows);
          setJournalTemplates(templateRows);
          setRuleSets(ruleSetRows);
        }
      } catch {
        if (!cancelled) {
          setPlaybooks([]);
          setSetupDefinitions([]);
          setMistakeDefinitions([]);
          setJournalTemplates([]);
          setRuleSets([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const records = useMemo(() => buildJournalTradeRecords(trades), [trades]);
  const groupedRecords = useMemo(
    () => buildJournalTradeGroups(records),
    [records],
  );

  const filteredGroups = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return groupedRecords.filter((group) => {
      const matchesSearch =
        query.length === 0 || group.searchText.includes(query);

      if (!matchesSearch) {
        return false;
      }

      if (statusFilter === "all") {
        return true;
      }

      if (statusFilter === "pending") {
        return (
          group.reviewStatus !== "complete" && group.reviewStatus !== "trivial"
        );
      }

      return group.reviewStatus === statusFilter;
    });
  }, [deferredSearch, groupedRecords, statusFilter]);

  const activeGroup = useMemo<JournalTradeGroupRecord | null>(() => {
    if (filteredGroups.length === 0) {
      return null;
    }

    if (
      tradeParam &&
      filteredGroups.some((group) =>
        group.trades.some((record) => record.trade.id === tradeParam),
      )
    ) {
      return (
        filteredGroups.find((group) =>
          group.trades.some((record) => record.trade.id === tradeParam),
        ) ?? null
      );
    }

    return (
      filteredGroups.find(
        (group) =>
          group.reviewStatus !== "complete" && group.reviewStatus !== "trivial",
      ) ??
      filteredGroups[0] ??
      null
    );
  }, [filteredGroups, tradeParam]);

  const activeTradeId = useMemo(() => {
    if (!activeGroup) {
      return null;
    }

    if (
      tradeParam &&
      activeGroup.trades.some((record) => record.trade.id === tradeParam)
    ) {
      return tradeParam;
    }

    return activeGroup.primaryTrade.trade.id;
  }, [activeGroup, tradeParam]);

  useEffect(() => {
    const nextUrl = withTradeQuery(
      pathname,
      new URLSearchParams(searchParams.toString()),
      activeTradeId,
    );
    const currentUrl = withTradeQuery(
      pathname,
      new URLSearchParams(searchParams.toString()),
      tradeParam,
    );

    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [activeTradeId, pathname, router, searchParams, tradeParam]);

  const activeIndex = filteredGroups.findIndex(
    (group) => group.id === activeGroup?.id,
  );
  const activeRecord =
    activeTradeId && activeGroup
      ? activeGroup.trades.find((record) => record.trade.id === activeTradeId) ??
        activeGroup.primaryTrade
      : null;
  const previousTradeId =
    activeIndex > 0
      ? filteredGroups[activeIndex - 1]?.primaryTrade.trade.id ?? null
      : null;
  const nextTradeId =
    activeIndex >= 0 && activeIndex < filteredGroups.length - 1
      ? filteredGroups[activeIndex + 1]?.primaryTrade.trade.id ?? null
      : null;
  const accountLabel =
    selectedAccountId === "unassigned"
      ? "Unassigned trades"
      : propAccounts.find((account) => account.id === selectedAccountId)
          ?.accountName ?? "All accounts";

  const goToTrade = useCallback(
    (tradeId: string) => {
      router.replace(
        withTradeQuery(
          pathname,
          new URLSearchParams(searchParams.toString()),
          tradeId,
        ),
        { scroll: false },
      );
    },
    [pathname, router, searchParams],
  );

  const handleSelectTrade = useCallback(
    (tradeId: string) => {
      goToTrade(tradeId);
      setBrowserOpen(false);
    },
    [goToTrade],
  );

  const handleOpenTradeQueue = useCallback(() => {
    setBrowserOpen(true);
  }, []);

  const goToNextPending = useCallback(() => {
    if (!activeRecord) {
      return;
    }

    const currentPosition = filteredGroups.findIndex(
      (group) => group.id === activeGroup?.id,
    );
    const nextPending =
      filteredGroups
        .slice(currentPosition + 1)
        .find(
          (group) =>
            group.reviewStatus !== "complete" &&
            group.reviewStatus !== "trivial",
        ) ??
      filteredGroups.find(
        (group) =>
          group.reviewStatus !== "complete" &&
          group.reviewStatus !== "trivial",
      );

    if (nextPending) {
      goToTrade(nextPending.primaryTrade.trade.id);
    }
  }, [activeGroup?.id, activeRecord, filteredGroups, goToTrade]);

  const handlePreviousTrade = useCallback(() => {
    if (previousTradeId) {
      goToTrade(previousTradeId);
    }
  }, [goToTrade, previousTradeId]);

  const handleNextTrade = useCallback(() => {
    if (nextTradeId) {
      goToTrade(nextTradeId);
    }
  }, [goToTrade, nextTradeId]);

  const activeDocument = activeRecord ? (
    <AnimatePresence mode="wait">
      <TradeReviewDocument
        key={activeRecord.trade.id}
        trade={activeRecord.trade}
        tradeIdea={activeGroup?.trades.map((record) => record.trade) ?? [activeRecord.trade]}
        activeTradeId={activeRecord.trade.id}
        onSelectTradeInIdea={handleSelectTrade}
        allTrades={trades}
        globalRules={profile?.trading_rules ?? []}
        userId={currentUserId ?? ""}
        playbooks={playbooks}
        setupDefinitions={setupDefinitions}
        mistakeDefinitions={mistakeDefinitions}
        journalTemplates={journalTemplates}
        ruleSets={ruleSets}
        index={activeIndex >= 0 ? activeIndex : 0}
        total={filteredGroups.length}
        hasPrevious={activeIndex > 0}
        hasNext={activeIndex >= 0 && activeIndex < filteredGroups.length - 1}
        onPrevious={handlePreviousTrade}
        onNext={handleNextTrade}
        onNextPending={
          filteredGroups.some(
            (group) =>
              group.reviewStatus !== "complete" &&
              group.reviewStatus !== "trivial",
          )
            ? goToNextPending
            : undefined
        }
        onOpenTradeQueue={handleOpenTradeQueue}
        tradeQueueLabel="Browse ideas"
        onSaved={handleTradeSaved}
      />
    </AnimatePresence>
  ) : null;

  if (loading) {
    return <LoadingJournalWorkspace />;
  }

  if (!currentUserId) {
    return (
      <div className="flex min-h-[calc(100dvh-64px)] flex-col px-4 py-4 sm:px-6 lg:h-[calc(100dvh-64px)]">
        <AppPanelEmptyState
          minHeight={260}
          title="Sign in to journal trades"
          description="The journal workspace needs your account session so it can load your closed trades and save reviews."
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[calc(100dvh-64px)] flex-col px-4 py-4 sm:px-6 lg:h-[calc(100dvh-64px)]">
        <AppPanelEmptyState
          minHeight={260}
          title="Could not load journal trades"
          description={loadError}
          action={(
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setReloadNonce((current) => current + 1)}
            >
              Retry
            </Button>
          )}
        />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-64px)] flex-col px-4 py-4 sm:px-6 2xl:h-[calc(100dvh-64px)]">
        <AppPanelEmptyState
          minHeight={260}
          title="No closed trades yet"
          description="Close a trade first, then come back here to write the review."
        />
      </div>
    );
  }

  return (
    <div className="journal-workspace-shell flex min-h-[calc(100dvh-64px)] min-h-0 flex-col gap-2 overflow-visible px-2 py-2 sm:gap-2 sm:px-2.5 sm:py-2.5 2xl:h-[calc(100dvh-64px)] 2xl:overflow-hidden 2xl:px-3">
      <section className="stagger-2 relative min-h-0 flex-1 overflow-visible 2xl:overflow-hidden">
        <AppPanel className="h-full min-h-0 overflow-hidden p-0 shadow-none">
          <div className="min-h-0 min-w-0 h-full overflow-hidden">
            {!activeRecord ? (
              <div className="flex h-full items-center justify-center px-6">
                <WidgetEmptyState
                  className="w-full max-w-md"
                  title="No trade in this view"
                  description="Clear the current filter to continue journaling."
                />
              </div>
            ) : (
              <div className="h-full overflow-y-auto">{activeDocument}</div>
            )}
          </div>
        </AppPanel>
      </section>

      <Sheet open={browserOpen} onOpenChange={setBrowserOpen}>
        <SheetContent
          side="left"
          className="h-full w-[92vw] max-w-none border-r p-0 sm:w-[24rem] sm:max-w-[24rem] lg:w-[26rem] lg:max-w-[26rem] xl:w-[28rem] xl:max-w-[28rem]"
          style={{
            background: "var(--surface-elevated)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle
            >
              Trade queue
            </SheetTitle>
            <SheetDescription>
              {accountLabel}. Pick a trade and return straight to the review.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            <TradeReviewRail
              layout="drawer"
              items={filteredGroups.map((group) => ({
                id: group.primaryTrade.trade.id,
                symbol: group.primaryTrade.trade.symbol,
                title: group.title,
                direction: group.direction,
                netPnl: group.netPnl,
                outcome: group.outcome,
                closedAt: group.closedAt,
                reviewStatus: group.reviewStatus as TradeReviewStatus,
                tradeCount: group.tradeCount,
                isTrivial: group.isTrivial,
              }))}
              activeTradeId={activeTradeId}
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onSelectTrade={handleSelectTrade}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
