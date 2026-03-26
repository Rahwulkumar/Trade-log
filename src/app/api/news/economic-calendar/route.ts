import { NextRequest, NextResponse } from "next/server";
import {
  getBuiltInEconomicCalendar,
  mapFinnhubCountryToCurrency,
  type EconomicEvent,
} from "@/lib/news/economic-calendar";

export type { EconomicEvent } from "@/lib/news/economic-calendar";

async function fetchFinnhub(from: string, to: string): Promise<EconomicEvent[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  const url = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) return [];

  const json = await res.json();
  const events = (json.economicCalendar || []) as Array<{
    time: string;
    country: string;
    event: string;
    impact: string;
    actual: string;
    estimate: string;
    prev: string;
  }>;

  return events.map((event, index) => ({
    id: String(index),
    time: event.time,
    currency: mapFinnhubCountryToCurrency(event.country),
    impact:
      event.impact === "3"
        ? "High"
        : event.impact === "2"
          ? "Medium"
          : "Low",
    event: event.event,
    actual: event.actual || null,
    forecast: event.estimate || null,
    previous: event.prev || null,
    country: event.country,
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? from;
  const currenciesParam = searchParams.get("currencies") ?? "";
  const currencies = currenciesParam
    ? currenciesParam.split(",").filter(Boolean)
    : [];
  const impact = searchParams.get("impact") ?? "all";

  try {
    let events = await fetchFinnhub(from, to);
    const usingMock = events.length === 0;

    if (usingMock) {
      events = getBuiltInEconomicCalendar(from, to, currencies);
    }

    if (currencies.length > 0 && !usingMock) {
      events = events.filter((event) => currencies.includes(event.currency));
    }

    if (impact !== "all") {
      events = events.filter(
        (event) => event.impact.toLowerCase() === impact.toLowerCase(),
      );
    }

    events.sort(
      (left, right) =>
        new Date(left.time).getTime() - new Date(right.time).getTime(),
    );

    return NextResponse.json({ events, usingMock });
  } catch (error) {
    console.error("[news/economic-calendar]", error);
    return NextResponse.json({
      events: getBuiltInEconomicCalendar(from, to, currencies).filter(
        (event) =>
          impact === "all" || event.impact.toLowerCase() === impact.toLowerCase(),
      ),
      usingMock: true,
    });
  }
}
