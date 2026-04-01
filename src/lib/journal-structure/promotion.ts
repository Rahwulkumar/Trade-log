export type PromotionCandidateSource =
  | "setup note"
  | "setup tag"
  | "mistake tag";

export interface JournalPromotionCandidate {
  label: string;
  count: number;
  sources: PromotionCandidateSource[];
  suggestedPlaybookId: string | null;
  suggestedPlaybookName: string | null;
}

export function normalizePromotionLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function toPromotionLookupKey(value: string) {
  return normalizePromotionLabel(value).toLowerCase();
}

export interface JournalPromotionRecord {
  tradeId: string;
  label: string | null | undefined;
  source: PromotionCandidateSource;
  playbookId: string | null;
  playbookName: string | null;
}

type PromotionAccumulator = {
  label: string;
  tradeIds: Set<string>;
  sources: Set<PromotionCandidateSource>;
  playbookCounts: Map<
    string,
    {
      id: string | null;
      name: string | null;
      tradeIds: Set<string>;
    }
  >;
};

export function buildPromotionCandidates(
  records: JournalPromotionRecord[],
  existingLabels: Iterable<string>,
  options?: {
    minCount?: number;
    limit?: number;
  },
): JournalPromotionCandidate[] {
  const minCount = options?.minCount ?? 2;
  const limit = options?.limit ?? 12;
  const existingLookup = new Set(
    [...existingLabels]
      .map((label) => toPromotionLookupKey(label))
      .filter(Boolean),
  );
  const buckets = new Map<string, PromotionAccumulator>();

  for (const record of records) {
    if (!record.label) {
      continue;
    }

    const label = normalizePromotionLabel(record.label);
    if (!label) {
      continue;
    }

    const key = toPromotionLookupKey(label);
    const current = buckets.get(key) ?? {
      label,
      tradeIds: new Set<string>(),
      sources: new Set<PromotionCandidateSource>(),
      playbookCounts: new Map<
        string,
        {
          id: string | null;
          name: string | null;
          tradeIds: Set<string>;
        }
      >(),
    };

    current.sources.add(record.source);
    current.tradeIds.add(record.tradeId);

    const playbookKey = record.playbookId ?? "__none";
    const playbookEntry = current.playbookCounts.get(playbookKey) ?? {
      id: record.playbookId,
      name: record.playbookName,
      tradeIds: new Set<string>(),
    };
    playbookEntry.tradeIds.add(record.tradeId);
    current.playbookCounts.set(playbookKey, playbookEntry);

    buckets.set(key, current);
  }

  return [...buckets.entries()]
    .filter(([key, entry]) => !existingLookup.has(key) && entry.tradeIds.size >= minCount)
    .map(([, entry]) => {
      const topPlaybook =
        [...entry.playbookCounts.values()].sort(
          (left, right) =>
            right.tradeIds.size - left.tradeIds.size ||
            (left.name ?? "").localeCompare(right.name ?? ""),
        )[0] ?? null;

      return {
        label: entry.label,
        count: entry.tradeIds.size,
        sources: [...entry.sources].sort(),
        suggestedPlaybookId: topPlaybook?.id ?? null,
        suggestedPlaybookName: topPlaybook?.name ?? null,
      };
    })
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label),
    )
    .slice(0, limit);
}
