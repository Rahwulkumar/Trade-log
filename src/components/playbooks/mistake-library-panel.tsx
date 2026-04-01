"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import type { MistakeDefinition } from "@/lib/db/schema";
import {
  createMistakeDefinition,
  deleteMistakeDefinition,
  getMistakePromotionCandidates,
  getMistakeDefinitions,
  updateMistakeDefinition,
} from "@/lib/api/client/journal-structure";
import { Button } from "@/components/ui/button";
import {
  AppMetricCard,
  AppPanel,
  SectionHeader,
} from "@/components/ui/page-primitives";
import {
  ChoiceChip,
  ControlSurface,
  FieldGroup,
} from "@/components/ui/control-primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingPanel } from "@/components/ui/loading";
import { WidgetEmptyState } from "@/components/ui/surface-primitives";
import { LibraryPromotionPanel } from "@/components/playbooks/library-promotion-panel";
import {
  normalizePromotionLabel,
  type JournalPromotionCandidate,
} from "@/lib/journal-structure/promotion";

export function MistakeLibraryPanel() {
  const [items, setItems] = useState<MistakeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promotionCandidates, setPromotionCandidates] = useState<
    JournalPromotionCandidate[]
  >([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MistakeDefinition | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    severity: "",
    description: "",
    correctionGuidance: "",
    isActive: true,
  });
  const deferredSearch = useDeferredValue(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [itemsResult, candidatesResult] = await Promise.allSettled([
      getMistakeDefinitions(),
      getMistakePromotionCandidates(),
    ]);

    if (itemsResult.status === "fulfilled") {
      setItems(itemsResult.value);
    } else {
      setError(
        itemsResult.reason instanceof Error
          ? itemsResult.reason.message
          : "Failed to load mistakes",
      );
    }

    if (candidatesResult.status === "fulfilled") {
      setPromotionCandidates(candidatesResult.value);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((item) =>
      [item.name, item.category ?? "", item.severity ?? "", item.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [deferredSearch, items]);

  function resetForm(target?: MistakeDefinition | null) {
    setEditing(target ?? null);
    setForm({
      name: target?.name ?? "",
      category: target?.category ?? "",
      severity: target?.severity ?? "",
      description: target?.description ?? "",
      correctionGuidance: target?.correctionGuidance ?? "",
      isActive: target?.isActive ?? true,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      category: form.category || null,
      severity: form.severity || null,
      description: form.description || null,
      correctionGuidance: form.correctionGuidance || null,
      isActive: form.isActive,
    };

    try {
      const saved = editing
        ? await updateMistakeDefinition(editing.id, payload)
        : await createMistakeDefinition(payload);
      setItems((current) =>
        editing
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setPromotionCandidates((current) =>
        current.filter(
          (candidate) =>
            normalizePromotionLabel(candidate.label).toLowerCase() !==
            normalizePromotionLabel(saved.name).toLowerCase(),
        ),
      );
      setOpen(false);
      resetForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save mistake");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this mistake?")) return;

    try {
      await deleteMistakeDefinition(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete mistake");
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <AppMetricCard label="Total Mistakes" value={String(items.length)} />
        <AppMetricCard
          label="Active"
          value={String(items.filter((item) => item.isActive).length)}
          tone="loss"
        />
        <AppMetricCard
          label="Categories"
          value={String(new Set(items.map((item) => item.category).filter(Boolean)).size)}
        />
      </div>

      <AppPanel>
        <SectionHeader
          title="Mistake Library"
          subtitle="Define recurring mistakes once so review and analytics stay consistent."
          actions={
            <Dialog
              open={open}
              onOpenChange={(next) => {
                setOpen(next);
                if (!next) resetForm(null);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => {
                    resetForm(null);
                    setOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New Mistake
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Mistake" : "Create Mistake"}</DialogTitle>
                  <DialogDescription>
                    Build a reusable mistake library for the journal and analytics.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <FieldGroup>
                    <Label htmlFor="mistake-name">Name</Label>
                    <Input
                      id="mistake-name"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </FieldGroup>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup>
                      <Label htmlFor="mistake-category">Category</Label>
                      <Input
                        id="mistake-category"
                        value={form.category}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, category: event.target.value }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="mistake-severity">Severity</Label>
                      <Input
                        id="mistake-severity"
                        value={form.severity}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, severity: event.target.value }))
                        }
                      />
                    </FieldGroup>
                  </div>
                  <FieldGroup>
                    <Label htmlFor="mistake-description">Description</Label>
                    <Textarea
                      id="mistake-description"
                      rows={4}
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="mistake-guidance">Correction Guidance</Label>
                    <Textarea
                      id="mistake-guidance"
                      rows={4}
                      value={form.correctionGuidance}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          correctionGuidance: event.target.value,
                        }))
                      }
                    />
                  </FieldGroup>
                  <div className="flex items-center gap-2">
                    <ChoiceChip
                      active={form.isActive}
                      onClick={() =>
                        setForm((current) => ({ ...current, isActive: !current.isActive }))
                      }
                    >
                      {form.isActive ? "Active" : "Inactive"}
                    </ChoiceChip>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {editing ? "Save Mistake" : "Create Mistake"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="mt-4">
          <LibraryPromotionPanel
            title="Promote repeated mistake labels"
            subtitle="Convert repeated freeform mistake tags into structured mistakes so review and analytics stay consistent."
            items={promotionCandidates}
            actionLabel="Start mistake"
            onPromote={(candidate) => {
              resetForm(null);
              setForm((current) => ({
                ...current,
                name: candidate.label,
              }));
              setOpen(true);
            }}
          />
        </div>

        <ControlSurface className="mt-4">
          <FieldGroup>
            <Label htmlFor="mistake-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <Input
                id="mistake-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search mistakes"
              />
            </div>
          </FieldGroup>
        </ControlSurface>

        {error ? <p className="mt-4 text-sm text-[var(--loss-primary)]">{error}</p> : null}

        {loading ? (
          <div className="mt-4">
            <LoadingPanel title="Loading mistake library" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-4">
            <WidgetEmptyState
              title="No mistakes yet"
              description="Create your first mistake definition to standardize review."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {filtered.map((item) => (
              <AppPanel key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {item.name}
                      </h3>
                      <ChoiceChip active={Boolean(item.isActive)}>
                        {item.isActive ? "Active" : "Inactive"}
                      </ChoiceChip>
                      {item.severity ? <ChoiceChip active>{item.severity}</ChoiceChip> : null}
                    </div>
                    {item.category ? (
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.category}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetForm(item);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void handleDelete(item.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                {item.description ? (
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">{item.description}</p>
                ) : null}
              </AppPanel>
            ))}
          </div>
        )}
      </AppPanel>
    </div>
  );
}
