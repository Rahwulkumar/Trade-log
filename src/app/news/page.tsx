"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  RefreshCw,
  Zap,
} from "lucide-react";

import type { EconomicEvent } from "@/lib/news/economic-calendar";
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
import {
  InsetPanel,
  ListItemRow,
  WidgetEmptyState,
} from "@/components/ui/surface-primitives";

type DateRange = "today" | "tomorrow" | "this-week" | "next-week";
type ImpactFilter = "all" | "High" | "Medium" | "Low";

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "CNY", name: "Chinese Yuan" },
];

const DATE_RANGE_OPTIONS: Array<{ key: DateRange; label: string }> = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "this-week", label: "This Week" },
  { key: "next-week", label: "Next Week" },
];

const IMPACT_OPTIONS: Array<{
  key: ImpactFilter;
  label: string;
  activeColor?: string;
  activeBackground?: string;
  activeBorderColor?: string;
}> = [
  { key: "all", label: "All" },
  {
    key: "High",
    label: "High",
    activeColor: "var(--loss-primary)",
    activeBackground: "var(--loss-bg)",
    activeBorderColor: "var(--loss-primary)",
  },
  {
    key: "Medium",
    label: "Medium",
    activeColor: "var(--warning-primary)",
    activeBackground: "var(--warning-bg)",
    activeBorderColor: "var(--warning-primary)",
  },
  {
    key: "Low",
    label: "Low",
    activeColor: "var(--accent-primary)",
    activeBackground: "var(--accent-soft)",
    activeBorderColor: "var(--accent-primary)",
  },
];

function getRange(range: DateRange): { from: string; to: string } {
  const today = new Date();
  const fmt = (date: Date) => format(date, "yyyy-MM-dd");

  switch (range) {
    case "today":
      return { from: fmt(today), to: fmt(today) };
    case "tomorrow":
      return {
        from: fmt(addDays(today, 1)),
        to: fmt(addDays(today, 1)),
      };
    case "this-week": {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      return { from: fmt(start), to: fmt(addDays(start, 6)) };
    }
    case "next-week": {
      const start = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
      return { from: fmt(start), to: fmt(addDays(start, 6)) };
    }
  }
}

function formatValue(value: string | null) {
  return value ?? "--";
}

function ImpactPill({ impact }: { impact: EconomicEvent["impact"] }) {
  const styles =
    impact === "High"
      ? {
          color: "var(--loss-primary)",
          background: "var(--loss-bg)",
          borderColor: "color-mix(in srgb, var(--loss-primary) 30%, transparent)",
        }
      : impact === "Medium"
        ? {
            color: "var(--warning-primary)",
            background: "var(--warning-bg)",
            borderColor:
              "color-mix(in srgb, var(--warning-primary) 30%, transparent)",
          }
        : {
            color: "var(--accent-primary)",
            background: "var(--accent-soft)",
            borderColor:
              "color-mix(in srgb, var(--accent-primary) 28%, transparent)",
          };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide"
      style={styles}
    >
      {impact}
    </span>
  );
}

function EventValueCell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | null;
  tone?: "default" | "accent";
}) {
  return (
    <InsetPanel
      tone={tone === "accent" && value ? "accent" : "default"}
      paddingClassName="px-3 py-2"
      className="min-w-0"
    >
      <p
        className="text-[0.6rem] uppercase tracking-widest font-bold"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </p>
      <p
        className="mono mt-1 text-[0.78rem] font-semibold"
        style={{
          color:
            tone === "accent" && value
              ? "var(--accent-primary)"
              : "var(--text-primary)",
        }}
      >
        {formatValue(value)}
      </p>
    </InsetPanel>
  );
}

function EventCard({
  event,
  nowTimestamp,
}: {
  event: EconomicEvent;
  nowTimestamp: number;
}) {
  const eventTime = new Date(event.time);
  const isUpcoming = eventTime.getTime() >= nowTimestamp;

  return (
    <ListItemRow
      className="sm:items-start"
      leading={
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <InsetPanel
              paddingClassName="px-3 py-2"
              className="min-w-[86px]"
              tone={isUpcoming ? "accent" : "default"}
            >
              <p
                className="mono text-[0.85rem] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {format(eventTime, "HH:mm")}
              </p>
              <p
                className="text-[0.63rem] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                {format(eventTime, "EEE, MMM d")}
              </p>
            </InsetPanel>

            <span
              className="inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[0.72rem] font-bold"
              style={{
                background: isUpcoming
                  ? "var(--accent-soft)"
                  : "var(--surface)",
                borderColor: isUpcoming
                  ? "var(--accent-primary)"
                  : "var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            >
              {event.currency}
            </span>

            <ImpactPill impact={event.impact} />

            <span
              className="rounded-full px-2 py-1 text-[0.65rem] font-medium"
              style={{
                background: isUpcoming
                  ? "var(--surface)"
                  : "var(--surface-elevated)",
                color: "var(--text-tertiary)",
              }}
            >
              {isUpcoming ? "Upcoming" : "Passed"}
            </span>
          </div>

          <div>
            <p
              className="text-[0.92rem] font-semibold leading-snug"
              style={{ color: "var(--text-primary)" }}
            >
              {event.event}
            </p>
            <p
              className="mt-1 text-[0.72rem] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              {event.country}
            </p>
          </div>
        </div>
      }
      trailing={
        <div className="grid min-w-full grid-cols-3 gap-2 sm:min-w-[260px]">
          <EventValueCell label="Actual" value={event.actual} tone="accent" />
          <EventValueCell label="Forecast" value={event.forecast} />
          <EventValueCell label="Previous" value={event.previous} />
        </div>
      }
    />
  );
}

function EventSkeleton() {
  return (
    <InsetPanel className="animate-pulse" paddingClassName="p-4">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div
            className="h-11 w-24 rounded-[var(--radius-md)]"
            style={{ background: "var(--border-subtle)" }}
          />
          <div
            className="h-8 w-16 rounded-full"
            style={{ background: "var(--border-subtle)" }}
          />
          <div
            className="h-8 w-20 rounded-full"
            style={{ background: "var(--border-subtle)" }}
          />
        </div>
        <div
          className="h-4 w-2/3 rounded"
          style={{ background: "var(--border-subtle)" }}
        />
        <div
          className="h-3 w-1/3 rounded"
          style={{ background: "var(--border-subtle)" }}
        />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-16 rounded-[var(--radius-md)]"
              style={{ background: "var(--border-subtle)" }}
            />
          ))}
        </div>
      </div>
    </InsetPanel>
  );
}

export default function NewsPage() {
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [impact, setImpact] = useState<ImpactFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState<number>(() => Date.now());

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { from, to } = getRange(dateRange);
      const params = new URLSearchParams({
        from,
        to,
        currencies: selectedCurrencies.join(","),
        impact,
      });

      const response = await fetch(`/api/news/economic-calendar?${params}`);
      if (!response.ok) {
        throw new Error("Failed to load calendar events");
      }

      const data = (await response.json()) as { events?: EconomicEvent[] };
      setEvents(Array.isArray(data.events) ? data.events : []);
      setLastUpdated(new Date());
      setNowTimestamp(Date.now());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load calendar events",
      );
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, impact, selectedCurrencies]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const highCount = useMemo(
    () => events.filter((event) => event.impact === "High").length,
    [events],
  );
  const mediumCount = useMemo(
    () => events.filter((event) => event.impact === "Medium").length,
    [events],
  );
  const lowCount = useMemo(
    () => events.filter((event) => event.impact === "Low").length,
    [events],
  );
  const upcomingCount = useMemo(
    () =>
      events.filter((event) => new Date(event.time).getTime() >= nowTimestamp)
        .length,
    [events, nowTimestamp],
  );

  const description = lastUpdated
    ? `${events.length} scheduled releases in view. Updated at ${format(lastUpdated, "HH:mm")}.`
    : "Major macro releases and central bank events for your selected window.";

  return (
    <div className="page-root page-sections">
      <AppPageHeader
        eyebrow="Market Calendar"
        title="Economic Calendar"
        description={description}
        icon={<Zap size={18} color="white" />}
        actions={
          <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <ControlSurface>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,240px)_minmax(0,240px)_1fr]">
          <FieldGroup label="Date Range">
            <div className="flex flex-wrap gap-2">
              {DATE_RANGE_OPTIONS.map((option) => (
                <ChoiceChip
                  key={option.key}
                  active={dateRange === option.key}
                  onClick={() => setDateRange(option.key)}
                >
                  {option.label}
                </ChoiceChip>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="Impact">
            <div className="flex flex-wrap gap-2">
              {IMPACT_OPTIONS.map((option) => (
                <ChoiceChip
                  key={option.key}
                  active={impact === option.key}
                  onClick={() => setImpact(option.key)}
                  activeColor={option.activeColor}
                  activeBackground={option.activeBackground}
                  activeBorderColor={option.activeBorderColor}
                >
                  {option.label}
                </ChoiceChip>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup
            label="Currencies"
            meta={
              selectedCurrencies.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 py-0 text-[0.72rem]"
                  onClick={() => setSelectedCurrencies([])}
                >
                  Clear all
                </Button>
              ) : null
            }
          >
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map((currency) => {
                const active = selectedCurrencies.includes(currency.code);
                return (
                  <ChoiceChip
                    key={currency.code}
                    active={active}
                    onClick={() =>
                      setSelectedCurrencies((current) =>
                        current.includes(currency.code)
                          ? current.filter((code) => code !== currency.code)
                          : [...current, currency.code],
                      )
                    }
                  >
                    {currency.code}
                  </ChoiceChip>
                );
              })}
            </div>
          </FieldGroup>
        </div>
      </ControlSurface>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AppMetricCard
          label="High Impact"
          value={String(highCount)}
          helper="Priority releases"
          tone="loss"
        />
        <AppMetricCard
          label="Medium Impact"
          value={String(mediumCount)}
          helper="Watch closely"
          tone="warning"
        />
        <AppMetricCard
          label="Low Impact"
          value={String(lowCount)}
          helper="Lower urgency"
          tone="accent"
        />
        <AppMetricCard
          label="Upcoming"
          value={String(upcomingCount)}
          helper="Still ahead"
          tone="default"
        />
      </div>

      {error ? (
        <AppPanelEmptyState
          title="Unable to load the calendar"
          description={error}
          action={
            <Button variant="outline" onClick={fetchEvents}>
              Try again
            </Button>
          }
        />
      ) : null}

      {!error ? (
        <AppPanel>
        <SectionHeader
          eyebrow="Event Feed"
          title="Major Scheduled Events"
          subtitle="Important macro releases and central bank events in your selected window."
          action={
            <InsetPanel
              paddingClassName="px-3 py-2"
              className="hidden sm:block"
            >
              <div className="flex items-center gap-2">
                <CalendarDays
                  className="h-4 w-4"
                  style={{ color: "var(--accent-primary)" }}
                />
                <span
                  className="mono text-[0.76rem] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {events.length}
                </span>
                <span
                  className="text-[0.7rem]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  events
                </span>
              </div>
            </InsetPanel>
          }
        />

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <EventSkeleton key={index} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <WidgetEmptyState
            icon={<Clock3 className="h-5 w-5" />}
            title="No events matched your filters"
            description="Adjust the date range, impact, or currencies to widen the calendar view."
            action={
              <Button variant="outline" onClick={() => {
                setImpact("all");
                setSelectedCurrencies([]);
                setDateRange("today");
              }}>
                Reset filters
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} nowTimestamp={nowTimestamp} />
            ))}
          </div>
        )}
        </AppPanel>
      ) : null}

      <InsetPanel
        tone="accent"
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="space-y-1">
          <p className="headline-md">Reading the calendar</p>
          <p
            className="text-[0.78rem] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Focus first on high-impact releases, then narrow to the currencies
            you actively trade. The filter bar and event cards now stay usable
            on mobile, tablet, and desktop without collapsing the impact detail.
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <AlertTriangle
            className="mt-0.5 h-4 w-4"
            style={{ color: "var(--warning-primary)" }}
          />
          <p
            className="max-w-xs text-[0.72rem] leading-relaxed"
            style={{ color: "var(--text-tertiary)" }}
          >
            Treat clustered high-impact releases as active risk windows and
            review the actual result once the event prints.
          </p>
        </div>
      </InsetPanel>
    </div>
  );
}
