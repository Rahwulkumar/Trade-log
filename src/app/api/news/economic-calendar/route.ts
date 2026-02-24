import { NextRequest, NextResponse } from "next/server";

export interface EconomicEvent {
  id: string;
  time: string;          // ISO string
  currency: string;      // e.g. "USD"
  impact: "High" | "Medium" | "Low";
  event: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  country: string;
}

// ─── Mock data for when no API key is set ─────────────────────────────────────
function getMockEvents(from: string, currencies: string[]): EconomicEvent[] {
  const base = new Date(from + "T00:00:00Z");
  const allEvents: EconomicEvent[] = [
    { id: "1", time: new Date(base.getTime() + 2 * 3600000).toISOString(), currency: "USD", impact: "High", event: "Non-Farm Payrolls", actual: null, forecast: "185K", previous: "199K", country: "United States" },
    { id: "2", time: new Date(base.getTime() + 4 * 3600000).toISOString(), currency: "USD", impact: "High", event: "CPI m/m", actual: null, forecast: "0.3%", previous: "0.4%", country: "United States" },
    { id: "3", time: new Date(base.getTime() + 6 * 3600000).toISOString(), currency: "EUR", impact: "Medium", event: "German CPI m/m", actual: null, forecast: "0.2%", previous: "0.1%", country: "Germany" },
    { id: "4", time: new Date(base.getTime() + 7 * 3600000).toISOString(), currency: "GBP", impact: "High", event: "BOE Rate Decision", actual: null, forecast: "5.25%", previous: "5.25%", country: "United Kingdom" },
    { id: "5", time: new Date(base.getTime() + 8 * 3600000).toISOString(), currency: "JPY", impact: "Low", event: "BOJ Meeting Minutes", actual: null, forecast: null, previous: null, country: "Japan" },
    { id: "6", time: new Date(base.getTime() + 9 * 3600000).toISOString(), currency: "CAD", impact: "Medium", event: "Retail Sales m/m", actual: null, forecast: "0.3%", previous: "-0.2%", country: "Canada" },
    { id: "7", time: new Date(base.getTime() + 10 * 3600000).toISOString(), currency: "AUD", impact: "Medium", event: "Employment Change", actual: null, forecast: "22.5K", previous: "11.5K", country: "Australia" },
    { id: "8", time: new Date(base.getTime() + 11 * 3600000).toISOString(), currency: "USD", impact: "Medium", event: "ISM Services PMI", actual: null, forecast: "52.8", previous: "53.4", country: "United States" },
    { id: "9", time: new Date(base.getTime() + 12 * 3600000).toISOString(), currency: "EUR", impact: "High", event: "ECB Interest Rate Decision", actual: null, forecast: "4.50%", previous: "4.50%", country: "Eurozone" },
    { id: "10", time: new Date(base.getTime() + 13 * 3600000).toISOString(), currency: "CHF", impact: "Low", event: "Trade Balance", actual: null, forecast: "2.9B", previous: "3.1B", country: "Switzerland" },
    { id: "11", time: new Date(base.getTime() + 14 * 3600000).toISOString(), currency: "NZD", impact: "Medium", event: "RBNZ Rate Decision", actual: null, forecast: "5.50%", previous: "5.50%", country: "New Zealand" },
    { id: "12", time: new Date(base.getTime() + 15 * 3600000).toISOString(), currency: "USD", impact: "High", event: "FOMC Statement", actual: null, forecast: null, previous: null, country: "United States" },
    { id: "13", time: new Date(base.getTime() + 16 * 3600000).toISOString(), currency: "GBP", impact: "Medium", event: "Manufacturing PMI", actual: "48.0", forecast: "47.8", previous: "47.2", country: "United Kingdom" },
    { id: "14", time: new Date(base.getTime() + 17 * 3600000).toISOString(), currency: "EUR", impact: "Low", event: "French Industrial Production m/m", actual: "0.5%", forecast: "0.3%", previous: "-0.2%", country: "France" },
    { id: "15", time: new Date(base.getTime() + 18 * 3600000).toISOString(), currency: "JPY", impact: "Medium", event: "Tokyo CPI y/y", actual: null, forecast: "2.1%", previous: "2.4%", country: "Japan" },
  ];
  return currencies.length > 0
    ? allEvents.filter((e) => currencies.includes(e.currency))
    : allEvents;
}

// ─── Finnhub fetch ────────────────────────────────────────────────────────────
async function fetchFinnhub(from: string, to: string): Promise<EconomicEvent[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  const url = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 900 } }); // 15 min cache
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

  // Map Finnhub → EconomicEvent
  const countryToCurrency: Record<string, string> = {
    "United States": "USD", "European Union": "EUR", "Germany": "EUR",
    "France": "EUR", "Italy": "EUR", "United Kingdom": "GBP", "Japan": "JPY",
    "Canada": "CAD", "Australia": "AUD", "Switzerland": "CHF", "New Zealand": "NZD",
    "China": "CNY", "Eurozone": "EUR",
  };

  return events.map((e, i) => ({
    id: String(i),
    time: e.time,
    currency: countryToCurrency[e.country] ?? "USD",
    impact: e.impact === "3" ? "High" : e.impact === "2" ? "Medium" : "Low",
    event: e.event,
    actual: e.actual || null,
    forecast: e.estimate || null,
    previous: e.prev || null,
    country: e.country,
  }));
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? from;
  const currenciesParam = searchParams.get("currencies") ?? "";
  const currencies = currenciesParam ? currenciesParam.split(",").filter(Boolean) : [];
  const impact = searchParams.get("impact") ?? "all";

  try {
    // Try live API first, fall back to mock
    let events = await fetchFinnhub(from, to);
    const usingMock = events.length === 0;
    if (usingMock) events = getMockEvents(from, currencies);

    // Filter by currency
    if (currencies.length > 0 && !usingMock) {
      events = events.filter((e) => currencies.includes(e.currency));
    }

    // Filter by impact
    if (impact !== "all") {
      events = events.filter((e) => e.impact.toLowerCase() === impact.toLowerCase());
    }

    // Sort by time
    events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return NextResponse.json({ events, usingMock });
  } catch (e) {
    console.error("[news/economic-calendar]", e);
    return NextResponse.json({ events: getMockEvents(from, currencies), usingMock: true });
  }
}
