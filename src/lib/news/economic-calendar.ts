export interface EconomicEvent {
  id: string;
  time: string;
  currency: string;
  impact: "High" | "Medium" | "Low";
  event: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  country: string;
}

type EventTemplate = {
  key: string;
  timeUtc: string;
  currency: string;
  impact: EconomicEvent["impact"];
  event: string;
  forecast: string | null;
  previous: string | null;
  country: string;
  weekdays: number[];
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  "United States": "USD",
  "European Union": "EUR",
  Germany: "EUR",
  France: "EUR",
  Italy: "EUR",
  "United Kingdom": "GBP",
  Japan: "JPY",
  Canada: "CAD",
  Australia: "AUD",
  Switzerland: "CHF",
  "New Zealand": "NZD",
  China: "CNY",
  Eurozone: "EUR",
};

const MAJOR_EVENT_TEMPLATES: EventTemplate[] = [
  {
    key: "cny-pmi",
    timeUtc: "01:30",
    currency: "CNY",
    impact: "Medium",
    event: "Manufacturing PMI",
    forecast: "50.4",
    previous: "50.1",
    country: "China",
    weekdays: [1],
  },
  {
    key: "eur-german-pmi",
    timeUtc: "07:55",
    currency: "EUR",
    impact: "Medium",
    event: "German Manufacturing PMI",
    forecast: "48.6",
    previous: "48.3",
    country: "Germany",
    weekdays: [1],
  },
  {
    key: "eur-flash-pmi",
    timeUtc: "08:00",
    currency: "EUR",
    impact: "High",
    event: "Flash Manufacturing PMI",
    forecast: "49.2",
    previous: "49.0",
    country: "Eurozone",
    weekdays: [1],
  },
  {
    key: "gbp-manufacturing-pmi",
    timeUtc: "08:30",
    currency: "GBP",
    impact: "Medium",
    event: "Manufacturing PMI",
    forecast: "51.1",
    previous: "50.8",
    country: "United Kingdom",
    weekdays: [1],
  },
  {
    key: "usd-ism-manufacturing",
    timeUtc: "14:00",
    currency: "USD",
    impact: "High",
    event: "ISM Manufacturing PMI",
    forecast: "49.8",
    previous: "49.3",
    country: "United States",
    weekdays: [1],
  },
  {
    key: "aud-rba-rate",
    timeUtc: "03:30",
    currency: "AUD",
    impact: "High",
    event: "RBA Cash Rate",
    forecast: "4.35%",
    previous: "4.35%",
    country: "Australia",
    weekdays: [2],
  },
  {
    key: "eur-cpi-flash",
    timeUtc: "09:00",
    currency: "EUR",
    impact: "High",
    event: "CPI Flash Estimate y/y",
    forecast: "2.4%",
    previous: "2.5%",
    country: "Eurozone",
    weekdays: [2],
  },
  {
    key: "gbp-claimant-count",
    timeUtc: "06:00",
    currency: "GBP",
    impact: "Medium",
    event: "Claimant Count Change",
    forecast: "12.1K",
    previous: "10.4K",
    country: "United Kingdom",
    weekdays: [2],
  },
  {
    key: "cad-gdp",
    timeUtc: "12:30",
    currency: "CAD",
    impact: "High",
    event: "GDP m/m",
    forecast: "0.2%",
    previous: "0.1%",
    country: "Canada",
    weekdays: [2],
  },
  {
    key: "usd-consumer-confidence",
    timeUtc: "14:00",
    currency: "USD",
    impact: "Medium",
    event: "CB Consumer Confidence",
    forecast: "102.1",
    previous: "101.3",
    country: "United States",
    weekdays: [2],
  },
  {
    key: "nzd-rbnz-rate",
    timeUtc: "02:00",
    currency: "NZD",
    impact: "High",
    event: "RBNZ Official Cash Rate",
    forecast: "5.50%",
    previous: "5.50%",
    country: "New Zealand",
    weekdays: [3],
  },
  {
    key: "jpy-boj-rate",
    timeUtc: "03:00",
    currency: "JPY",
    impact: "High",
    event: "BOJ Policy Rate",
    forecast: "0.10%",
    previous: "0.10%",
    country: "Japan",
    weekdays: [3],
  },
  {
    key: "usd-adp",
    timeUtc: "12:15",
    currency: "USD",
    impact: "High",
    event: "ADP Non-Farm Employment Change",
    forecast: "142K",
    previous: "139K",
    country: "United States",
    weekdays: [3],
  },
  {
    key: "usd-cpi",
    timeUtc: "12:30",
    currency: "USD",
    impact: "High",
    event: "CPI m/m",
    forecast: "0.3%",
    previous: "0.4%",
    country: "United States",
    weekdays: [3],
  },
  {
    key: "usd-core-cpi",
    timeUtc: "12:30",
    currency: "USD",
    impact: "High",
    event: "Core CPI m/m",
    forecast: "0.3%",
    previous: "0.3%",
    country: "United States",
    weekdays: [3],
  },
  {
    key: "usd-ism-services",
    timeUtc: "14:00",
    currency: "USD",
    impact: "High",
    event: "ISM Services PMI",
    forecast: "52.9",
    previous: "52.4",
    country: "United States",
    weekdays: [3],
  },
  {
    key: "chf-snb-rate",
    timeUtc: "07:30",
    currency: "CHF",
    impact: "High",
    event: "SNB Policy Rate",
    forecast: "1.25%",
    previous: "1.25%",
    country: "Switzerland",
    weekdays: [4],
  },
  {
    key: "gbp-boe-rate",
    timeUtc: "12:00",
    currency: "GBP",
    impact: "High",
    event: "BOE Official Bank Rate",
    forecast: "5.25%",
    previous: "5.25%",
    country: "United Kingdom",
    weekdays: [4],
  },
  {
    key: "eur-ecb-rate",
    timeUtc: "12:15",
    currency: "EUR",
    impact: "High",
    event: "ECB Main Refinancing Rate",
    forecast: "4.50%",
    previous: "4.50%",
    country: "Eurozone",
    weekdays: [4],
  },
  {
    key: "eur-ecb-press",
    timeUtc: "12:45",
    currency: "EUR",
    impact: "High",
    event: "ECB Press Conference",
    forecast: null,
    previous: null,
    country: "Eurozone",
    weekdays: [4],
  },
  {
    key: "usd-claims",
    timeUtc: "12:30",
    currency: "USD",
    impact: "Medium",
    event: "Unemployment Claims",
    forecast: "221K",
    previous: "218K",
    country: "United States",
    weekdays: [4],
  },
  {
    key: "usd-ppi",
    timeUtc: "12:30",
    currency: "USD",
    impact: "Medium",
    event: "Core PPI m/m",
    forecast: "0.2%",
    previous: "0.3%",
    country: "United States",
    weekdays: [4],
  },
  {
    key: "jpy-tokyo-cpi",
    timeUtc: "23:30",
    currency: "JPY",
    impact: "Medium",
    event: "Tokyo Core CPI y/y",
    forecast: "2.2%",
    previous: "2.3%",
    country: "Japan",
    weekdays: [5],
  },
  {
    key: "usd-nfp",
    timeUtc: "12:30",
    currency: "USD",
    impact: "High",
    event: "Non-Farm Payrolls",
    forecast: "185K",
    previous: "199K",
    country: "United States",
    weekdays: [5],
  },
  {
    key: "usd-unemployment",
    timeUtc: "12:30",
    currency: "USD",
    impact: "High",
    event: "Unemployment Rate",
    forecast: "4.0%",
    previous: "4.0%",
    country: "United States",
    weekdays: [5],
  },
  {
    key: "usd-ahe",
    timeUtc: "12:30",
    currency: "USD",
    impact: "High",
    event: "Average Hourly Earnings m/m",
    forecast: "0.3%",
    previous: "0.2%",
    country: "United States",
    weekdays: [5],
  },
  {
    key: "cad-employment",
    timeUtc: "12:30",
    currency: "CAD",
    impact: "High",
    event: "Employment Change",
    forecast: "18.4K",
    previous: "15.2K",
    country: "Canada",
    weekdays: [5],
  },
  {
    key: "cad-unemployment",
    timeUtc: "12:30",
    currency: "CAD",
    impact: "Medium",
    event: "Unemployment Rate",
    forecast: "6.1%",
    previous: "6.1%",
    country: "Canada",
    weekdays: [5],
  },
  {
    key: "usd-uom-sentiment",
    timeUtc: "14:00",
    currency: "USD",
    impact: "Medium",
    event: "Prelim UoM Consumer Sentiment",
    forecast: "77.1",
    previous: "76.9",
    country: "United States",
    weekdays: [5],
  },
];

function parseDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function formatDay(day: Date): string {
  return day.toISOString().slice(0, 10);
}

function eachDay(from: string, to: string): Date[] {
  const start = parseDay(from);
  const end = parseDay(to);
  const days: Date[] = [];

  for (
    let current = new Date(start);
    current.getTime() <= end.getTime();
    current = new Date(current.getTime() + 86_400_000)
  ) {
    days.push(new Date(current));
  }

  return days;
}

function nextBusinessDay(date: Date): Date {
  const day = date.getUTCDay();
  if (day >= 1 && day <= 5) return new Date(date);

  const daysToAdd = day === 6 ? 2 : 1;
  return new Date(date.getTime() + daysToAdd * 86_400_000);
}

function buildEventFromTemplate(day: Date, template: EventTemplate): EconomicEvent {
  const eventDay = formatDay(day);

  return {
    id: `${eventDay}-${template.key}`,
    time: new Date(`${eventDay}T${template.timeUtc}:00.000Z`).toISOString(),
    currency: template.currency,
    impact: template.impact,
    event: template.event,
    actual: null,
    forecast: template.forecast,
    previous: template.previous,
    country: template.country,
  };
}

export function getBuiltInEconomicCalendar(
  from: string,
  to: string,
  currencies: string[],
): EconomicEvent[] {
  const days = eachDay(from, to);
  const events: EconomicEvent[] = [];

  for (const day of days) {
    const weekday = day.getUTCDay();
    for (const template of MAJOR_EVENT_TEMPLATES) {
      if (!template.weekdays.includes(weekday)) continue;
      if (currencies.length > 0 && !currencies.includes(template.currency)) {
        continue;
      }

      events.push(buildEventFromTemplate(day, template));
    }
  }

  if (events.length > 0) {
    return events.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );
  }

  const fallbackDay = nextBusinessDay(parseDay(from));
  const fallbackWeekday = fallbackDay.getUTCDay();

  return MAJOR_EVENT_TEMPLATES.filter((template) => {
    if (!template.weekdays.includes(fallbackWeekday)) return false;
    if (currencies.length > 0 && !currencies.includes(template.currency)) {
      return false;
    }
    return true;
  })
    .map((template) => buildEventFromTemplate(fallbackDay, template))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

export function mapFinnhubCountryToCurrency(country: string): string {
  return COUNTRY_TO_CURRENCY[country] ?? "USD";
}
