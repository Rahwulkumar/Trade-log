"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import type { JournalTemplate } from "@/lib/db/schema";
import {
  createJournalTemplate,
  deleteJournalTemplate,
  getJournalTemplates,
  updateJournalTemplate,
} from "@/lib/api/client/journal-structure";
import {
  DEFAULT_JOURNAL_TEMPLATE_CONFIG,
  JOURNAL_TEMPLATE_CHAPTER_IDS,
  JOURNAL_TEMPLATE_SCOPE_TYPES,
  normalizeJournalTemplateConfig,
  type JournalTemplateChapterId,
  type JournalTemplateConfig,
  type JournalTemplateScopeType,
} from "@/lib/journal-structure/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingPanel } from "@/components/ui/loading";
import { WidgetEmptyState } from "@/components/ui/surface-primitives";

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

function joinLineItems(values: string[]): string {
  return values.join("\n");
}

function findPlaybookName(playbooks: PlaybookOption[], id: string | null): string {
  if (!id) return "No linked strategy";
  return playbooks.find((playbook) => playbook.id === id)?.name ?? "Linked strategy";
}

export function JournalTemplateLibraryPanel({
  playbooks,
}: {
  playbooks: PlaybookOption[];
}) {
  const [items, setItems] = useState<JournalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JournalTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    scopeType: "global" as JournalTemplateScopeType,
    playbookId: "__none",
    version: 1,
    isActive: true,
    enabledChapters: [...DEFAULT_JOURNAL_TEMPLATE_CONFIG.enabledChapters],
    requiredFields: joinLineItems(DEFAULT_JOURNAL_TEMPLATE_CONFIG.requiredFields),
    checklistItems: joinLineItems(DEFAULT_JOURNAL_TEMPLATE_CONFIG.checklistItems),
    screenshotRequired: DEFAULT_JOURNAL_TEMPLATE_CONFIG.screenshotRequired,
    narrativePrompt: "",
    thesisPrompt: "",
    marketPrompt: "",
    executionPrompt: "",
    psychologyPrompt: "",
    closeoutPrompt: "",
  });
  const deferredSearch = useDeferredValue(search);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await getJournalTemplates());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((item) =>
      [item.name, item.description ?? "", item.scopeType]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [deferredSearch, items]);

  function resetForm(target?: JournalTemplate | null) {
    const config = normalizeJournalTemplateConfig(
      (target?.config as Partial<JournalTemplateConfig> | undefined) ??
        DEFAULT_JOURNAL_TEMPLATE_CONFIG,
    );

    setEditing(target ?? null);
    setForm({
      name: target?.name ?? "",
      description: target?.description ?? "",
      scopeType: (target?.scopeType as JournalTemplateScopeType) ?? "global",
      playbookId: target?.playbookId ?? "__none",
      version: target?.version ?? 1,
      isActive: target?.isActive ?? true,
      enabledChapters: [...config.enabledChapters],
      requiredFields: joinLineItems(config.requiredFields),
      checklistItems: joinLineItems(config.checklistItems),
      screenshotRequired: config.screenshotRequired,
      narrativePrompt: config.prompts.narrative ?? "",
      thesisPrompt: config.prompts.thesis ?? "",
      marketPrompt: config.prompts.market ?? "",
      executionPrompt: config.prompts.execution ?? "",
      psychologyPrompt: config.prompts.psychology ?? "",
      closeoutPrompt: config.prompts.closeout ?? "",
    });
  }

  function buildConfig(): JournalTemplateConfig {
    return normalizeJournalTemplateConfig({
      enabledChapters: form.enabledChapters,
      requiredFields: parseLineItems(form.requiredFields),
      checklistItems: parseLineItems(form.checklistItems),
      screenshotRequired: form.screenshotRequired,
      prompts: {
        narrative: form.narrativePrompt,
        thesis: form.thesisPrompt,
        market: form.marketPrompt,
        execution: form.executionPrompt,
        psychology: form.psychologyPrompt,
        closeout: form.closeoutPrompt,
      },
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || null,
      scopeType: form.scopeType,
      playbookId: form.playbookId === "__none" ? null : form.playbookId,
      version: form.version,
      isActive: form.isActive,
      config: buildConfig(),
    };

    try {
      const saved = editing
        ? await updateJournalTemplate(editing.id, payload)
        : await createJournalTemplate(payload);

      setItems((current) =>
        editing
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setOpen(false);
      resetForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;

    try {
      await deleteJournalTemplate(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <AppMetricCard label="Total Templates" value={String(items.length)} />
        <AppMetricCard
          label="Active"
          value={String(items.filter((item) => item.isActive).length)}
          tone="profit"
        />
        <AppMetricCard
          label="Scoped To Strategy"
          value={String(items.filter((item) => item.playbookId).length)}
        />
      </div>

      <AppPanel>
        <SectionHeader
          title="Journal Templates"
          subtitle="Shape the journal flow, prompts, and checklist by workflow."
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
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Template" : "Create Template"}</DialogTitle>
                  <DialogDescription>
                    Templates decide which chapters appear and what the journal asks for.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup>
                      <Label htmlFor="template-name">Name</Label>
                      <Input
                        id="template-name"
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="template-version">Version</Label>
                      <Input
                        id="template-version"
                        type="number"
                        min={1}
                        value={form.version}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            version: Number(event.target.value || 1),
                          }))
                        }
                      />
                    </FieldGroup>
                  </div>

                  <FieldGroup>
                    <Label htmlFor="template-description">Description</Label>
                    <Textarea
                      id="template-description"
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
                      <Label htmlFor="template-scope">Scope</Label>
                      <Select
                        value={form.scopeType}
                        onValueChange={(value: JournalTemplateScopeType) =>
                          setForm((current) => ({ ...current, scopeType: value }))
                        }
                      >
                        <SelectTrigger id="template-scope">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {JOURNAL_TEMPLATE_SCOPE_TYPES.map((scope) => (
                            <SelectItem key={scope} value={scope}>
                              {scope}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="template-playbook">Strategy</Label>
                      <Select
                        value={form.playbookId}
                        onValueChange={(value) =>
                          setForm((current) => ({ ...current, playbookId: value }))
                        }
                      >
                        <SelectTrigger id="template-playbook">
                          <SelectValue placeholder="No linked strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">No linked strategy</SelectItem>
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
                    <Label>Enabled Chapters</Label>
                    <div className="flex flex-wrap gap-2">
                      {JOURNAL_TEMPLATE_CHAPTER_IDS.map((chapter) => {
                        const active = form.enabledChapters.includes(chapter);
                        return (
                          <ChoiceChip
                            key={chapter}
                            active={active}
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                enabledChapters: active
                                  ? current.enabledChapters.filter((item) => item !== chapter)
                                  : [...current.enabledChapters, chapter as JournalTemplateChapterId],
                              }))
                            }
                          >
                            {chapter}
                          </ChoiceChip>
                        );
                      })}
                    </div>
                  </FieldGroup>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup>
                      <Label htmlFor="template-required">Required Fields</Label>
                      <Textarea
                        id="template-required"
                        rows={4}
                        value={form.requiredFields}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            requiredFields: event.target.value,
                          }))
                        }
                        placeholder="One field key per line"
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="template-checklist">Checklist Items</Label>
                      <Textarea
                        id="template-checklist"
                        rows={4}
                        value={form.checklistItems}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            checklistItems: event.target.value,
                          }))
                        }
                        placeholder="One checklist item per line"
                      />
                    </FieldGroup>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup>
                      <Label htmlFor="template-narrative">Narrative Prompt</Label>
                      <Input
                        id="template-narrative"
                        value={form.narrativePrompt}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            narrativePrompt: event.target.value,
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="template-thesis">Thesis Prompt</Label>
                      <Input
                        id="template-thesis"
                        value={form.thesisPrompt}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            thesisPrompt: event.target.value,
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="template-market">Market Prompt</Label>
                      <Input
                        id="template-market"
                        value={form.marketPrompt}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            marketPrompt: event.target.value,
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="template-execution">Execution Prompt</Label>
                      <Input
                        id="template-execution"
                        value={form.executionPrompt}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            executionPrompt: event.target.value,
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="template-psychology">Psychology Prompt</Label>
                      <Input
                        id="template-psychology"
                        value={form.psychologyPrompt}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            psychologyPrompt: event.target.value,
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="template-closeout">Closeout Prompt</Label>
                      <Input
                        id="template-closeout"
                        value={form.closeoutPrompt}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            closeoutPrompt: event.target.value,
                          }))
                        }
                      />
                    </FieldGroup>
                  </div>

                  <div className="flex items-center gap-2">
                    <ChoiceChip
                      active={form.screenshotRequired}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          screenshotRequired: !current.screenshotRequired,
                        }))
                      }
                    >
                      {form.screenshotRequired ? "Screenshots required" : "Screenshots optional"}
                    </ChoiceChip>
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
                      {editing ? "Save Template" : "Create Template"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <ControlSurface className="mt-4">
          <FieldGroup>
            <Label htmlFor="template-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <Input
                id="template-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search templates"
              />
            </div>
          </FieldGroup>
        </ControlSurface>

        {error ? <p className="mt-4 text-sm text-[var(--loss-primary)]">{error}</p> : null}

        {loading ? (
          <div className="mt-4">
            <LoadingPanel title="Loading templates" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-4">
            <WidgetEmptyState
              title="No templates yet"
              description="Create your first template to shape the journal flow."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {filtered.map((item) => {
              const config = normalizeJournalTemplateConfig(
                (item.config as Partial<JournalTemplateConfig> | undefined) ??
                  DEFAULT_JOURNAL_TEMPLATE_CONFIG,
              );

              return (
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
                        <ChoiceChip active>{item.scopeType}</ChoiceChip>
                        <ChoiceChip active>v{item.version}</ChoiceChip>
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
                  <p className="mt-3 text-xs text-[var(--text-secondary)]">
                    {config.enabledChapters.length} chapters enabled, {config.checklistItems.length} checklist items,{" "}
                    {config.screenshotRequired ? "screenshots required" : "screenshots optional"}.
                  </p>
                </AppPanel>
              );
            })}
          </div>
        )}
      </AppPanel>
    </div>
  );
}
