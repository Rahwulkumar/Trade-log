export type TradingSessionLabel =
  | "Asia"
  | "London"
  | "New York"
  | "Overnight";

const EST_OFFSET_HOURS = -5;

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getEstClock(date: Date) {
  const shifted = new Date(date.getTime() + EST_OFFSET_HOURS * 60 * 60 * 1000);
  return {
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

function estMinutesOfDay(date: Date): number {
  const { hours, minutes } = getEstClock(date);
  return hours * 60 + minutes;
}

export function normalizeTradingSession(
  value: string | null | undefined,
): TradingSessionLabel | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "asian" || normalized === "asia") return "Asia";
  if (normalized === "london") return "London";
  if (normalized === "new york" || normalized === "newyork") {
    return "New York";
  }
  if (normalized === "overnight" || normalized === "off session") {
    return "Overnight";
  }
  return null;
}

export function deriveTradingSession(
  value: Date | string | null | undefined,
): TradingSessionLabel | null {
  const date = toDate(value);
  if (!date) return null;

  const minutes = estMinutesOfDay(date);

  if (minutes >= 20 * 60 || minutes < 2 * 60) {
    return "Asia";
  }

  if (minutes >= 2 * 60 && minutes < 5 * 60) {
    return "London";
  }

  if (minutes >= 8 * 60 && minutes < 11 * 60 + 30) {
    return "New York";
  }

  return "Overnight";
}

export function resolveTradingSession(
  storedSession: string | null | undefined,
  timestamp: Date | string | null | undefined,
): TradingSessionLabel | null {
  return deriveTradingSession(timestamp) ?? normalizeTradingSession(storedSession);
}

export function formatEstTime(
  value: Date | string | null | undefined,
): string | null {
  const date = toDate(value);
  if (!date) return null;

  const { hours, minutes } = getEstClock(date);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} EST`;
}
