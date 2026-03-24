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
  AppPageHeader,
  AppPanel,
  AppPanelEmptyState,
} from "@/components/ui/page-primitives";
import { WidgetEmptyState } from "@/components/ui/surface-primitives";
import { mapTradeToViewModel } from "@/domain/journal-mapper";
import type { JournalTradeViewModel } from "@/domain/journal-types";
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
    viewModel.notes.trim().length >= 80,
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const deferredSearch = useDeferredValue(search);
  const tradeParam = searchParams.get("trade");

  const loadTrades = useCallback(async () => {
    if (!user?.id) {
      return [] as Trade[];
    }

    return getTrades({
      status: "closed",
      propAccountId: selectedAccountId ?? undefined,
      sortBy: "exitDate",
      sortOrder: "desc",
      limit: 400,
    });
  }, [selectedAccountId, user?.id]);

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
      if (!user?.id) {
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
  }, [loadTrades, user?.id]);

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
      <div className="page-root page-sections h-[calc(100dvh-64px)]">
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

  if (records.length === 0) {
    return (
      <div className="page-root page-sections h-[calc(100dvh-64px)]">
        <AppPanelEmptyState
          minHeight={260}
          title="No closed trades yet"
          description="Close a trade first, then come back here to write the review."
        />
      </div>
    );
  }

  return (
    <div className="page-root page-sections h-[calc(100dvh-64px)] overflow-hidden">
      <AppPageHeader
        className="stagger-1"
        eyebrow="Trade Review"
        title="Journal"
        description={`Post-trade review for ${accountLabel}. ${pendingCount} still need review.`}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="badge-accent rounded-full px-2.5 py-1">
              {pendingCount} pending
            </span>
            <span style={{ color: "var(--text-tertiary)" }}>
              {records.length} closed trades loaded
            </span>
          </div>
        }
      />

      <section className="stagger-2 grid min-h-0 flex-1 grid-rows-[300px_minmax(0,1fr)] gap-5 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-1">
        <AppPanel className="min-h-0 overflow-hidden p-0">
          <TradeReviewRail
            items={filteredRecords.map((record) => record.item)}
            activeTradeId={activeTradeId}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onSelectTrade={goToTrade}
          />
        </AppPanel>

        <AppPanel className="min-h-0 overflow-hidden p-0">
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
      </section>
    </div>
  );
}
