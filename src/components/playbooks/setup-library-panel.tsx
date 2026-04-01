"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import type { SetupDefinition } from "@/lib/db/schema";
import {
  createSetupDefinition,
  deleteSetupDefinition,
  getSetupPromotionCandidates,
  getSetupDefinitions,
  updateSetupDefinition,
} from "@/lib/api/client/journal-structure";
import { Button } from "@/components/ui/button";
import {
  AppMetricCard,
  AppPanel,
  SectionHeader,
} from "@/components/ui/page-primitives";
import {
  ControlSurface,
  FieldGroup,
  ChoiceChip,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingPanel } from "@/components/ui/loading";
import { WidgetEmptyState } from "@/components/ui/surface-primitives";
import { LibraryPromotionPanel } from "@/components/playbooks/library-promotion-panel";
import {
  normalizePromotionLabel,
  type JournalPromotionCandidate,
} from "@/lib/journal-structure/promotion";

interface PlaybookOption {
  id: string;
  name: string;
}

function parseLineItems(raw: string): string[] {
  return raw
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLineItems(values: unknown): string {
  if (!Array.isArray(values)) {
    return "";
  }

  return values
    .filter((value): value is string => typeof value === "string")
    .join("\n");
}

function findPlaybookName(playbooks: PlaybookOption[], id: string | null): string {
  if (!id) return "Any strategy";
  return playbooks.find((playbook) => playbook.id === id)?.name ?? "Linked strategy";
}

export function SetupLibraryPanel({
  playbooks,
}: {
  playbooks: PlaybookOption[];
}) {
  const [items, setItems] = useState<SetupDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promotionCandidates, setPromotionCandidates] = useState<
    JournalPromotionCandidate[]
  >([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SetupDefinition | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    playbookId: "__none",
    preferredSession: "",
    preferredMarketCondition: "",
    entryCriteria: "",
    invalidationRules: "",
    managementNotes: "",
    exampleNotes: "",
    isActive: true,
  });
  const deferredSearch = useDeferredValue(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [itemsResult, candidatesResult] = await Promise.allSettled([
      getSetupDefinitions(),
      getSetupPromotionCandidates(),
    ]);

    if (itemsResult.status === "fulfilled") {
      setItems(itemsResult.value);
    } else {
      setError(
        itemsResult.reason instanceof Error
          ? itemsResult.reason.message
          : "Failed to load setups",
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
      [
        item.name,
        item.description ?? "",
        item.preferredSession ?? "",
        item.preferredMarketCondition ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [deferredSearch, items]);

  function resetForm(target?: SetupDefinition | null) {
    setEditing(target ?? null);
    setForm({
      name: target?.name ?? "",
      description: target?.description ?? "",
      playbookId: target?.playbookId ?? "__none",
      preferredSession: target?.preferredSession ?? "",
      preferredMarketCondition: target?.preferredMarketCondition ?? "",
      entryCriteria: joinLineItems(target?.entryCriteria),
      invalidationRules: target?.invalidationRules ?? "",
      managementNotes: target?.managementNotes ?? "",
      exampleNotes: target?.exampleNotes ?? "",
      isActive: target?.isActive ?? true,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || null,
      playbookId: form.playbookId === "__none" ? null : form.playbookId,
      preferredSession: form.preferredSession || null,
      preferredMarketCondition: form.preferredMarketCondition || null,
      entryCriteria: parseLineItems(form.entryCriteria),
      invalidationRules: form.invalidationRules || null,
      managementNotes: form.managementNotes || null,
      exampleNotes: form.exampleNotes || null,
      isActive: form.isActive,
    };

    try {
      const saved = editing
        ? await updateSetupDefinition(editing.id, payload)
        : await createSetupDefinition(payload);

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
      setError(err instanceof Error ? err.message : "Failed to save setup");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this setup?")) return;

    try {
      await deleteSetupDefinition(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete setup");
    }
  }

  const summary = useMemo(
    () => [
      { label: "Total Setups", value: String(items.length), tone: "default" as const },
      {
        label: "Active",
        value: String(items.filter((item) => item.isActive).length),
        tone: "profit" as const,
      },
      {
        label: "Linked To Strategy",
        value: String(items.filter((item) => item.playbookId).length),
        tone: "default" as const,
      },
    ],
    [items],
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {summary.map((item) => (
          <AppMetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            tone={item.tone}
          />
        ))}
      </div>

      <AppPanel>
        <SectionHeader
          title="Setup Library"
          subtitle="Define reusable setups once, then classify trades consistently."
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
                  New Setup
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Setup" : "Create Setup"}</DialogTitle>
                  <DialogDescription>
                    Build reusable setup definitions the journal can attach to trades.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup>
                      <Label htmlFor="setup-name">Name</Label>
                      <Input
                        id="setup-name"
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="setup-playbook">Strategy</Label>
                      <Select
                        value={form.playbookId}
                        onValueChange={(value) =>
                          setForm((current) => ({ ...current, playbookId: value }))
                        }
                      >
                        <SelectTrigger id="setup-playbook">
                          <SelectValue placeholder="Any strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Any strategy</SelectItem>
                          {playbooks.map((playbook) => (
                            <SelectItem key={playbook.id} value={playbook.id}>
                              {playbook.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>

                  <FieldGroup>
                    <Label htmlFor="setup-description">Description</Label>
                    <Textarea
                      id="setup-description"
                      rows={3}
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </FieldGroup>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup>
                      <Label htmlFor="setup-session">Preferred Session</Label>
                      <Input
                        id="setup-session"
                        value={form.preferredSession}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            preferredSession: event.target.value,
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="setup-condition">Market Condition</Label>
                      <Input
                        id="setup-condition"
                        value={form.preferredMarketCondition}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            preferredMarketCondition: event.target.value,
                          }))
                        }
                      />
                    </FieldGroup>
                  </div>

                  <FieldGroup>
                    <Label htmlFor="setup-entry">Entry Criteria</Label>
                    <Textarea
                      id="setup-entry"
                      rows={4}
                      value={form.entryCriteria}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          entryCriteria: event.target.value,
                        }))
                      }
                      placeholder="One checklist item per line"
                    />
                  </FieldGroup>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup>
                      <Label htmlFor="setup-invalidation">Invalidation</Label>
                      <Textarea
                        id="setup-invalidation"
                        rows={4}
                        value={form.invalidationRules}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            invalidationRules: event.target.value,
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="setup-management">Management Notes</Label>
                      <Textarea
                        id="setup-management"
                        rows={4}
                        value={form.managementNotes}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            managementNotes: event.target.value,
                          }))
                        }
                      />
                    </FieldGroup>
                  </div>

                  <FieldGroup>
                    <Label htmlFor="setup-examples">Example Notes</Label>
                    <Textarea
                      id="setup-examples"
                      rows={3}
                      value={form.exampleNotes}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          exampleNotes: event.target.value,
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
                      {editing ? "Save Setup" : "Create Setup"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="mt-4">
          <LibraryPromotionPanel
            title="Promote repeated setup labels"
            subtitle="Start clean definitions from the setup names and tags you already used repeatedly in the journal."
            items={promotionCandidates}
            actionLabel="Start setup"
            onPromote={(candidate) => {
              resetForm(null);
              setForm((current) => ({
                ...current,
                name: candidate.label,
                playbookId: candidate.suggestedPlaybookId ?? "__none",
              }));
              setOpen(true);
            }}
          />
        </div>

        <ControlSurface className="mt-4">
          <FieldGroup>
            <Label htmlFor="setup-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <Input
                id="setup-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search setups"
              />
            </div>
          </FieldGroup>
        </ControlSurface>

        {error ? <p className="mt-4 text-sm text-[var(--loss-primary)]">{error}</p> : null}

        {loading ? (
          <div className="mt-4">
            <LoadingPanel title="Loading setup library" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-4">
            <WidgetEmptyState
              title="No setups yet"
              description="Create your first setup so the journal can classify trades consistently."
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
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {findPlaybookName(playbooks, item.playbookId)}
                    </p>
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
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.preferredSession ? <ChoiceChip active>{item.preferredSession}</ChoiceChip> : null}
                  {item.preferredMarketCondition ? (
                    <ChoiceChip active>{item.preferredMarketCondition}</ChoiceChip>
                  ) : null}
                </div>
              </AppPanel>
            ))}
          </div>
        )}
      </AppPanel>
    </div>
  );
}
