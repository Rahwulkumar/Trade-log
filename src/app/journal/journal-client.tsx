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
import { mapTradeToViewModel } from "@/domain/journal-mapper";
import type { JournalTradeViewModel } from "@/domain/journal-types";
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
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";
import type { RuleSetWithItems } from "@/lib/rulebooks/types";

type StatusFilter = "all" | "pending" | "draft" | "complete";

interface JournalTradeRecord {
  trade: Trade;
  searchText: string;
  closedAt: string | null;
  netPnl: number;
  outcome: "WIN" | "LOSS" | "BE";
  reviewStatus: TradeReviewStatus;
  item: TradeReviewRailItem;
}

function formatTradeSearchDate(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getOutcome(value: number): "WIN" | "LOSS" | "BE" {
  if (value > 0.5) return "WIN";
  if (value < -0.5) return "LOSS";
  return "BE";
}

function getReviewStatus(viewModel: JournalTradeViewModel): TradeReviewStatus {
  const review = viewModel.journalReview;

  const signals = [
    viewModel.notes.trim().length > 0 || viewModel.screenshots.length > 0,
    Boolean(viewModel.playbookId || review.strategyName),
    Boolean(
      review.reasonForTrade ||
        review.invalidation ||
        review.targetPlan ||
        review.higherTimeframeBias ||
        viewModel.setupTags.length > 0,
    ),
    Boolean(
      review.priorSessionBehavior ||
        review.sessionState ||
        viewModel.marketCondition ||
        review.marketContext,
    ),
    Boolean(
      review.entryReason ||
        review.scaleInNotes ||
        review.managementReview ||
        review.exitReason,
    ),
    Boolean(
      review.psychologyBeforeTags.length > 0 ||
        review.psychologyDuringTags.length > 0 ||
        review.psychologyAfterTags.length > 0 ||
        viewModel.feelings,
    ),
    Boolean(
      viewModel.entryRating ||
        viewModel.exitRating ||
        viewModel.managementRating ||
        review.overallGrade ||
        review.retakeDecision ||
        viewModel.tradeRuleResults.length > 0 ||
        viewModel.mistakeDefinitionIds.length > 0,
    ),
    Boolean(
      viewModel.lessonLearned ||
        review.primaryFailureCause ||
        review.stopDoing ||
        review.followUpAction,
    ),
  ].filter(Boolean).length;

  if (signals === 0) {
    return "empty";
  }
  if (signals >= 5) {
    return "complete";
  }
  return "draft";
}

function buildSearchText(viewModel: JournalTradeViewModel): string {
  return [
    viewModel.symbol,
    formatTradeSearchDate(viewModel.exitDate),
    viewModel.session ?? "",
    viewModel.notes,
    viewModel.observations,
    viewModel.executionArrays.join(" "),
    viewModel.setupTags.join(" "),
    viewModel.mistakeTags.join(" "),
    viewModel.journalReview.strategyName,
    viewModel.journalReview.setupName,
    viewModel.journalReview.reasonForTrade,
    viewModel.journalReview.marketContext,
  ]
    .join(" ")
    .toLowerCase();
}

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
  const { user } = useAuth();
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
  const [railOpen, setRailOpen] = useState(false);
  const [desktopBrowserOpen, setDesktopBrowserOpen] = useState(false);
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

  const records = useMemo<JournalTradeRecord[]>(() => {
    return trades
      .map((trade) => {
        const viewModel = mapTradeToViewModel(trade);
        const closedAt = viewModel.exitDate ?? viewModel.entryDate;
        const netPnl = getTradeNetPnl(trade);
        const outcome = getOutcome(netPnl);
        const reviewStatus = getReviewStatus(viewModel);

        return {
          trade,
          searchText: buildSearchText(viewModel),
          closedAt,
          netPnl,
          outcome,
          reviewStatus,
          item: {
            id: trade.id,
            symbol: trade.symbol,
            direction:
              trade.direction === "SHORT"
                ? ("SHORT" as const)
                : ("LONG" as const),
            netPnl,
            outcome,
            closedAt,
            reviewStatus,
          },
        };
      })
      .sort((left, right) => {
        const leftTime = left.closedAt ? new Date(left.closedAt).getTime() : 0;
        const rightTime = right.closedAt
          ? new Date(right.closedAt).getTime()
          : 0;
        return rightTime - leftTime;
      });
  }, [trades]);

  const filteredRecords = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        query.length === 0 || record.searchText.includes(query);

      if (!matchesSearch) {
        return false;
      }

      if (statusFilter === "all") {
        return true;
      }

      if (statusFilter === "pending") {
        return record.reviewStatus !== "complete";
      }

      return record.reviewStatus === statusFilter;
    });
  }, [deferredSearch, records, statusFilter]);

  const activeTradeId = useMemo(() => {
    if (filteredRecords.length === 0) {
      return null;
    }

    if (
      tradeParam &&
      filteredRecords.some((record) => record.trade.id === tradeParam)
    ) {
      return tradeParam;
    }

    return (
      filteredRecords.find((record) => record.reviewStatus !== "complete")?.trade
        .id ?? filteredRecords[0].trade.id
    );
  }, [filteredRecords, tradeParam]);

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

  const activeIndex = filteredRecords.findIndex(
    (record) => record.trade.id === activeTradeId,
  );
  const activeRecord = activeIndex >= 0 ? filteredRecords[activeIndex] : null;
  const previousTradeId =
    activeIndex > 0 ? filteredRecords[activeIndex - 1]?.trade.id ?? null : null;
  const nextTradeId =
    activeIndex >= 0 && activeIndex < filteredRecords.length - 1
      ? filteredRecords[activeIndex + 1]?.trade.id ?? null
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
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 1280px)").matches
      ) {
        setDesktopBrowserOpen(false);
      } else {
        setRailOpen(false);
      }
    },
    [goToTrade],
  );

  const handleOpenTradeQueue = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1280px)").matches
    ) {
      setDesktopBrowserOpen((current) => !current);
      return;
    }

    setRailOpen(true);
  }, []);

  const goToNextPending = useCallback(() => {
    if (!activeRecord) {
      return;
    }

    const currentPosition = filteredRecords.findIndex(
      (record) => record.trade.id === activeRecord.trade.id,
    );
    const nextPending =
      filteredRecords
        .slice(currentPosition + 1)
        .find((record) => record.reviewStatus !== "complete") ??
      filteredRecords.find((record) => record.reviewStatus !== "complete");

    if (nextPending) {
      goToTrade(nextPending.trade.id);
    }
  }, [activeRecord, filteredRecords, goToTrade]);

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
        userId={currentUserId ?? ""}
        playbooks={playbooks}
        setupDefinitions={setupDefinitions}
        mistakeDefinitions={mistakeDefinitions}
        journalTemplates={journalTemplates}
        ruleSets={ruleSets}
        index={activeIndex >= 0 ? activeIndex : 0}
        total={filteredRecords.length}
        hasPrevious={activeIndex > 0}
        hasNext={activeIndex >= 0 && activeIndex < filteredRecords.length - 1}
        onPrevious={handlePreviousTrade}
        onNext={handleNextTrade}
        onNextPending={
          filteredRecords.some((record) => record.reviewStatus !== "complete")
            ? goToNextPending
            : undefined
        }
        onOpenTradeQueue={handleOpenTradeQueue}
        tradeQueueLabel={desktopBrowserOpen ? "Hide trades" : "Browse trades"}
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
          <div className="flex h-full min-h-0 flex-col">
            {desktopBrowserOpen ? (
              <div
                className="hidden shrink-0 border-b px-3 py-3 xl:block sm:px-4 lg:px-5"
                style={{ borderBottomColor: "var(--border-subtle)" }}
              >
                <TradeReviewRail
                  layout="tray"
                  items={filteredRecords.map((record) => record.item)}
                  activeTradeId={activeTradeId}
                  search={search}
                  onSearchChange={setSearch}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  onSelectTrade={handleSelectTrade}
                />
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-hidden">
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
          </div>
        </AppPanel>
      </section>

      <Sheet open={railOpen} onOpenChange={setRailOpen}>
        <SheetContent
          side="left"
          className="h-full w-[92vw] max-w-none border-r p-0 xl:hidden sm:w-[24rem] sm:max-w-[24rem] lg:w-[26rem] lg:max-w-[26rem]"
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
              items={filteredRecords.map((record) => record.item)}
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
