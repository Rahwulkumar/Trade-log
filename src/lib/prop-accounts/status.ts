import { and, eq, isNotNull, isNull, ne, or } from "drizzle-orm";

import { propAccounts, trades } from "@/lib/db/schema";

export const PROP_ACCOUNT_STATUS_ACTIVE = "active";
export const PROP_ACCOUNT_STATUS_ARCHIVED = "archived";

export type PropAccountDeleteMode = "archive" | "permanent";

export function buildVisiblePropAccountCondition() {
  return or(
    isNull(propAccounts.status),
    ne(propAccounts.status, PROP_ACCOUNT_STATUS_ARCHIVED),
  )!;
}

export function buildArchivedPropAccountCondition() {
  return eq(propAccounts.status, PROP_ACCOUNT_STATUS_ARCHIVED);
}

export function buildVisibleTradeAccountCondition() {
  return or(
    and(
      isNull(trades.propAccountId),
      or(
        isNotNull(trades.mt5AccountId),
        isNull(trades.externalId),
        isNull(trades.externalDealId),
      ),
    ),
    and(
      isNotNull(trades.propAccountId),
      or(
        isNull(propAccounts.status),
        ne(propAccounts.status, PROP_ACCOUNT_STATUS_ARCHIVED),
      ),
    ),
  )!;
}
