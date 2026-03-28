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
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
import { mapTradeToViewModel } from "@/domain/journal-mapper";
import type { JournalTradeViewModel } from "@/domain/journal-types";
import {
  getPlaybooks,
  type Playbook,
} from "@/lib/api/client/playbooks";
import { getTrades } from "@/lib/api/client/trades";
import type { Trade } from "@/lib/api/trades";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";

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
    viewModel.notes.trim().length >= 80 || viewModel.screenshots.length > 0,
    Boolean(review.strategyName || review.setupName || viewModel.playbookId),
    Boolean(
      review.reasonForTrade ||
        review.entryReason ||
        review.targetPlan ||
        review.invalidation,
    ),
    Boolean(
      review.managementReview ||
        review.exitReason ||
        viewModel.executionNotes ||
        viewModel.executionArrays.length > 0 ||
        viewModel.entryRating ||
        viewModel.exitRating ||
        viewModel.managementRating,
    ),
    Boolean(
      review.psychologyBefore ||
        review.psychologyDuring ||
        review.psychologyAfter ||
        viewModel.feelings,
    ),
    Boolean(viewModel.lessonLearned || review.followUpAction),
  ].filter(Boolean).length;

  if (signals === 0) {
    return "empty";
  }
  if (signals >= 4) {
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [railOpen, setRailOpen] = useState(false);

  const currentUserId = user?.id ?? null;
  const deferredSearch = useDeferredValue(search);
  const tradeParam = searchParams.get("trade");

  const loadTrades = useCallback(async () => {
    if (!currentUserId) {
      return [] as Trade[];
    }

    return getTrades({
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
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
      }

      const rows = await loadTrades();

      if (!cancelled) {
        setTrades(rows);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, loadTrades]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!currentUserId) {
        if (!cancelled) {
          setPlaybooks([]);
        }
        return;
      }

      try {
        const rows = await getPlaybooks();
        if (!cancelled) {
          setPlaybooks(rows);
        }
      } catch {
        if (!cancelled) {
          setPlaybooks([]);
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
  const pendingCount = records.filter(
    (record) => record.reviewStatus !== "complete",
  ).length;
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
      if (typeof window !== "undefined") {
        const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
        if (!isDesktop) {
          setRailOpen(false);
        }
        return;
      }

      setRailOpen(false);
    },
    [goToTrade],
  );

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

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-64px)] flex-col px-4 py-4 sm:px-6">
        <AppPanel className="flex min-h-[220px] items-center px-6">
          <p
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-inter)",
              fontSize: "13px",
            }}
          >
            Loading trade journal...
          </p>
        </AppPanel>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="flex h-[calc(100dvh-64px)] flex-col px-4 py-4 sm:px-6">
        <AppPanelEmptyState
          minHeight={260}
          title="Sign in to journal trades"
          description="The journal workspace needs your account session so it can load your closed trades and save reviews."
        />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex h-[calc(100dvh-64px)] flex-col px-4 py-4 sm:px-6">
        <AppPanelEmptyState
          minHeight={260}
          title="No closed trades yet"
          description="Close a trade first, then come back here to write the review."
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-64px)] min-h-0 flex-col gap-4 overflow-hidden px-4 py-4 sm:px-6">
      <div
        className="stagger-1 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-lg)] border px-3 py-2.5 sm:px-4"
        style={{
          background: "color-mix(in srgb, var(--surface) 92%, transparent)",
          borderColor: "var(--border-subtle)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <span
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-inter)",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            Journal
          </span>
          <span
            className="rounded-full px-2 py-1"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-inter)",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            {accountLabel}
          </span>
          <span
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-inter)",
              fontSize: "12px",
            }}
          >
            {pendingCount} pending
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRailOpen((current) => !current)}
            style={{
              background: "var(--surface)",
              borderColor: railOpen
                ? "var(--accent-primary)"
                : "var(--border-subtle)",
              color: railOpen
                ? "var(--accent-primary)"
                : "var(--text-primary)",
            }}
          >
            {railOpen ? (
              <PanelLeftClose size={14} />
            ) : (
              <PanelLeftOpen size={14} />
            )}
            {railOpen ? "Hide trades" : "Browse trades"}
          </Button>
          <span className="badge-accent rounded-full px-2.5 py-1">
            {records.length} loaded
          </span>
        </div>
      </div>

      <section className="stagger-2 relative min-h-0 flex-1 overflow-hidden">
        <div className="hidden h-full min-h-0 lg:block">
          <div
            className="grid h-full min-h-0 gap-4"
            style={{
              gridTemplateColumns: railOpen
                ? "minmax(24rem, 29rem) minmax(0, 1fr)"
                : "0 minmax(0, 1fr)",
              transition: "grid-template-columns 220ms ease",
            }}
          >
            <div
              className="min-h-0 overflow-hidden"
              style={{
                opacity: railOpen ? 1 : 0,
                pointerEvents: railOpen ? "auto" : "none",
                transition: "opacity 180ms ease",
              }}
            >
              <AppPanel className="h-full min-h-0 overflow-hidden p-0 shadow-[0_20px_48px_rgba(15,23,42,0.12)]">
                <TradeReviewRail
                  items={filteredRecords.map((record) => record.item)}
                  activeTradeId={activeTradeId}
                  search={search}
                  onSearchChange={setSearch}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  onSelectTrade={handleSelectTrade}
                />
              </AppPanel>
            </div>

            <AppPanel className="h-full min-h-0 overflow-hidden p-0 shadow-none">
              {!activeRecord ? (
                <div className="flex h-full items-center justify-center px-6">
                  <WidgetEmptyState
                    className="w-full max-w-md"
                    title="No trade in this view"
                    description="Clear the current filter to continue journaling."
                  />
                </div>
              ) : (
                <div className="min-h-0 h-full overflow-y-auto">
                  <AnimatePresence mode="wait">
                    <TradeReviewDocument
                      key={activeRecord.trade.id}
                      trade={activeRecord.trade}
                      userId={currentUserId}
                      playbooks={playbooks}
                      index={activeIndex >= 0 ? activeIndex : 0}
                      total={filteredRecords.length}
                      hasPrevious={activeIndex > 0}
                      hasNext={activeIndex >= 0 && activeIndex < filteredRecords.length - 1}
                      onPrevious={() => {
                        if (activeIndex > 0) {
                          goToTrade(filteredRecords[activeIndex - 1].trade.id);
                        }
                      }}
                      onNext={() => {
                        if (
                          activeIndex >= 0 &&
                          activeIndex < filteredRecords.length - 1
                        ) {
                          goToTrade(filteredRecords[activeIndex + 1].trade.id);
                        }
                      }}
                      onNextPending={
                        filteredRecords.some(
                          (record) => record.reviewStatus !== "complete",
                        )
                          ? goToNextPending
                          : undefined
                      }
                      onSaved={handleTradeSaved}
                    />
                  </AnimatePresence>
                </div>
              )}
            </AppPanel>
          </div>
        </div>

        <div className="h-full min-h-0 lg:hidden">
          {railOpen ? (
            <button
              type="button"
              aria-label="Close trade list"
              className="absolute inset-0 z-10"
              onClick={() => setRailOpen(false)}
              style={{
                background:
                  "color-mix(in srgb, var(--surface) 62%, transparent)",
              }}
            />
          ) : null}

          {railOpen ? (
            <div className="absolute inset-y-0 left-0 z-20 w-full max-w-[29rem] pr-3 sm:w-[25rem]">
              <AppPanel className="h-full min-h-0 overflow-hidden p-0 shadow-[0_20px_48px_rgba(15,23,42,0.18)]">
                <TradeReviewRail
                  items={filteredRecords.map((record) => record.item)}
                  activeTradeId={activeTradeId}
                  search={search}
                  onSearchChange={setSearch}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  onSelectTrade={handleSelectTrade}
                />
              </AppPanel>
            </div>
          ) : null}

          <AppPanel className="h-full min-h-0 overflow-hidden p-0 shadow-none">
            {!activeRecord ? (
              <div className="flex h-full items-center justify-center px-6">
                <WidgetEmptyState
                  className="w-full max-w-md"
                  title="No trade in this view"
                  description="Clear the current filter to continue journaling."
                />
              </div>
            ) : (
              <div className="min-h-0 h-full overflow-y-auto">
                <AnimatePresence mode="wait">
                  <TradeReviewDocument
                    key={activeRecord.trade.id}
                    trade={activeRecord.trade}
                    userId={currentUserId}
                    playbooks={playbooks}
                    index={activeIndex >= 0 ? activeIndex : 0}
                    total={filteredRecords.length}
                    hasPrevious={activeIndex > 0}
                    hasNext={activeIndex >= 0 && activeIndex < filteredRecords.length - 1}
                    onPrevious={() => {
                      if (activeIndex > 0) {
                        goToTrade(filteredRecords[activeIndex - 1].trade.id);
                      }
                    }}
                    onNext={() => {
                      if (
                        activeIndex >= 0 &&
                        activeIndex < filteredRecords.length - 1
                      ) {
                        goToTrade(filteredRecords[activeIndex + 1].trade.id);
                      }
                    }}
                    onNextPending={
                      filteredRecords.some(
                        (record) => record.reviewStatus !== "complete",
                      )
                        ? goToNextPending
                        : undefined
                    }
                    onSaved={handleTradeSaved}
                  />
                </AnimatePresence>
              </div>
            )}
          </AppPanel>
        </div>
      </section>
    </div>
  );
}
