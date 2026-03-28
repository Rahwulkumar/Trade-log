export const DEFAULT_ANALYTICS_TIME_ZONE = "Etc/GMT+4";

const TIME_ZONE_ALIASES: Record<string, string> = {
  utc: "UTC",
  "utc-4": DEFAULT_ANALYTICS_TIME_ZONE,
  est: "America/New_York",
  pst: "America/Los_Angeles",
  ist: "Asia/Kolkata",
};

export function normalizeAnalyticsTimeZone(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = TIME_ZONE_ALIASES[trimmed.toLowerCase()] ?? trimmed;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format(new Date());
    return normalized;
  } catch {
    return null;
  }
}

export function resolveAnalyticsTimeZone(
  requestedTimeZone: string | null | undefined,
  profileTimeZone: string | null | undefined,
): string {
  const explicit = normalizeAnalyticsTimeZone(requestedTimeZone);
  if (explicit) return explicit;

  const legacyProfileValue = profileTimeZone?.trim().toLowerCase();
  if (legacyProfileValue && legacyProfileValue !== "utc") {
    const profileResolved = normalizeAnalyticsTimeZone(profileTimeZone);
    if (profileResolved) return profileResolved;
  }

  return DEFAULT_ANALYTICS_TIME_ZONE;
}

export function formatAnalyticsTimeZoneLabel(
  timeZone: string | null | undefined,
): string {
  const normalized = normalizeAnalyticsTimeZone(timeZone);
  if (!normalized) return "UTC-4";

  if (normalized === DEFAULT_ANALYTICS_TIME_ZONE) return "UTC-4";
  if (normalized === "UTC") return "UTC";
  if (normalized === "America/New_York") return "Eastern Time";
  if (normalized === "America/Los_Angeles") return "Pacific Time";
  if (normalized === "Asia/Kolkata") return "India Standard Time";

  return normalized;
}
