"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";

import type {
  JournalTemplate,
  PropAccount,
  SetupDefinition,
} from "@/lib/db/schema";
import {
  createRuleSet,
  deleteRuleSet,
  getJournalTemplates,
  getRuleSets,
  getSetupDefinitions,
  updateRuleSet,
} from "@/lib/api/client/journal-structure";
import { RULE_SET_SCOPE_TYPES, type RuleSetScopeType, type RuleSetWithItems } from "@/lib/rulebooks/types";
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
import { InsetPanel, WidgetEmptyState } from "@/components/ui/surface-primitives";

interface PlaybookOption {
  id: string;
  name: string;
}

interface RuleItemForm {
  title: string;
  description: string;
  category: string;
  severity: string;
  isActive: boolean;
}

interface RulebookFormState {
  name: string;
  description: string;
  scopeType: RuleSetScopeType;
  playbookId: string;
  setupDefinitionId: string;
  journalTemplateId: string;
  propAccountId: string;
  isActive: boolean;
  items: RuleItemForm[];
}

const EMPTY_RULE_ITEM: RuleItemForm = {
  title: "",
  description: "",
  category: "",
  severity: "",
  isActive: true,
};

const DEFAULT_FORM: RulebookFormState = {
  name: "",
  description: "",
  scopeType: "global",
  playbookId: "__none",
  setupDefinitionId: "__none",
  journalTemplateId: "__none",
  propAccountId: "__none",
  isActive: true,
  items: [{ ...EMPTY_RULE_ITEM }],
};

function getScopeLabel(scopeType: RuleSetScopeType) {
  if (scopeType === "account") return "Account";
  if (scopeType === "playbook") return "Playbook";
  if (scopeType === "setup") return "Setup";
  if (scopeType === "template") return "Template";
  return "Global";
}

function findLabel(
  options: Array<{ id: string; name: string }>,
  id: string | null,
  fallback: string,
) {
  if (!id) return fallback;
  return options.find((option) => option.id === id)?.name ?? fallback;
}

export function RulebookLibraryPanel({
  playbooks,
  propAccounts,
}: {
  playbooks: PlaybookOption[];
  propAccounts: PropAccount[];
}) {
  const [items, setItems] = useState<RuleSetWithItems[]>([]);
  const [setupDefinitions, setSetupDefinitions] = useState<SetupDefinition[]>([]);
  const [journalTemplates, setJournalTemplates] = useState<JournalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RuleSetWithItems | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RulebookFormState>(DEFAULT_FORM);
  const deferredSearch = useDeferredValue(search);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [rulebookRows, setupRows, templateRows] = await Promise.all([
        getRuleSets(),
        getSetupDefinitions({ activeOnly: true }),
        getJournalTemplates({ activeOnly: true }),
      ]);
      setItems(rulebookRows);
      setSetupDefinitions(setupRows);
      setJournalTemplates(templateRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rulebooks");
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
      [
        item.name,
        item.description ?? "",
        item.scopeType,
        ...item.items.map((rule) => `${rule.title} ${rule.category ?? ""} ${rule.severity ?? ""}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [deferredSearch, items]);

  function resetForm(target?: RuleSetWithItems | null) {
    setEditing(target ?? null);
    setForm(
      target
        ? {
            name: target.name,
            description: target.description ?? "",
            scopeType: (target.scopeType as RuleSetScopeType) ?? "global",
            playbookId: target.playbookId ?? "__none",
            setupDefinitionId: target.setupDefinitionId ?? "__none",
            journalTemplateId: target.journalTemplateId ?? "__none",
            propAccountId: target.propAccountId ?? "__none",
            isActive: target.isActive ?? true,
            items:
              target.items.length > 0
                ? target.items.map((rule) => ({
                    title: rule.title,
                    description: rule.description ?? "",
                    category: rule.category ?? "",
                    severity: rule.severity ?? "",
                    isActive: rule.isActive ?? true,
                  }))
                : [{ ...EMPTY_RULE_ITEM }],
          }
        : {
            ...DEFAULT_FORM,
            items: [{ ...EMPTY_RULE_ITEM }],
          },
    );
  }

  function setRuleItem(
    index: number,
    next: Partial<RuleItemForm>,
  ) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...next } : item,
      ),
    }));
  }

  function addRuleItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, { ...EMPTY_RULE_ITEM }],
    }));
  }

  function removeRuleItem(index: number) {
    setForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? [{ ...EMPTY_RULE_ITEM }]
          : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
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
      setupDefinitionId:
        form.setupDefinitionId === "__none" ? null : form.setupDefinitionId,
      journalTemplateId:
        form.journalTemplateId === "__none" ? null : form.journalTemplateId,
      propAccountId: form.propAccountId === "__none" ? null : form.propAccountId,
      isActive: form.isActive,
      items: form.items
        .map((item) => ({
          title: item.title.trim(),
          description: item.description.trim() || null,
          category: item.category.trim() || null,
          severity: item.severity.trim() || null,
          isActive: item.isActive,
        }))
        .filter((item) => item.title.length > 0),
    };

    try {
      const saved = editing
        ? await updateRuleSet(editing.id, payload)
        : await createRuleSet(payload);

      setItems((current) =>
        editing
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setOpen(false);
      resetForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rulebook");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this rulebook?")) return;

    try {
      await deleteRuleSet(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rulebook");
    }
  }

  const summary = useMemo(
    () => [
      { label: "Total Rulebooks", value: String(items.length), tone: "default" as const },
      {
        label: "Active",
        value: String(items.filter((item) => item.isActive).length),
        tone: "profit" as const,
      },
      {
        label: "Rules",
        value: String(items.reduce((sum, item) => sum + item.items.length, 0)),
        tone: "default" as const,
      },
    ],
    [items],
  );

  const accountOptions = useMemo(
    () =>
      propAccounts.map((account) => ({
        id: account.id,
        name: account.accountName,
      })),
    [propAccounts],
  );

  const scopeMeta = useMemo(() => {
    if (form.scopeType === "playbook") return "This rulebook resolves for trades linked to one strategy.";
    if (form.scopeType === "setup") return "This rulebook resolves when the selected setup matches.";
    if (form.scopeType === "template") return "This rulebook resolves from the journal template workflow.";
    if (form.scopeType === "account") return "This rulebook resolves for one prop account.";
    return "Global rulebooks are fallbacks when no more specific rulebook applies.";
  }, [form.scopeType]);

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
          title="Rulebook Library"
          subtitle="Define reusable rulebooks once, then evaluate every trade against the right discipline framework."
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
                  New Rulebook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Rulebook" : "Create Rulebook"}</DialogTitle>
                  <DialogDescription>
                    Define a reusable discipline framework, then link it to an account, strategy, setup, or journal template.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup>
                      <Label htmlFor="rulebook-name">Name</Label>
                      <Input
                        id="rulebook-name"
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="rulebook-scope">Scope</Label>
                      <Select
                        value={form.scopeType}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            scopeType: value as RuleSetScopeType,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RULE_SET_SCOPE_TYPES.map((scope) => (
                            <SelectItem key={scope} value={scope}>
                              {getScopeLabel(scope)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>

                  <FieldGroup>
                    <Label htmlFor="rulebook-description">Description</Label>
                    <Textarea
                      id="rulebook-description"
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

                  <InsetPanel tone="accent">
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {scopeMeta}
                    </p>
                  </InsetPanel>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup>
                      <Label htmlFor="rulebook-playbook">Strategy</Label>
                      <Select
                        value={form.playbookId}
                        onValueChange={(value) =>
                          setForm((current) => ({ ...current, playbookId: value }))
                        }
                      >
                        <SelectTrigger className="w-full" id="rulebook-playbook">
                          <SelectValue />
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
                    <FieldGroup>
                      <Label htmlFor="rulebook-account">Account</Label>
                      <Select
                        value={form.propAccountId}
                        onValueChange={(value) =>
                          setForm((current) => ({ ...current, propAccountId: value }))
                        }
                      >
                        <SelectTrigger className="w-full" id="rulebook-account">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Any account</SelectItem>
                          {accountOptions.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="rulebook-setup">Setup</Label>
                      <Select
                        value={form.setupDefinitionId}
                        onValueChange={(value) =>
                          setForm((current) => ({ ...current, setupDefinitionId: value }))
                        }
                      >
                        <SelectTrigger className="w-full" id="rulebook-setup">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Any setup</SelectItem>
                          {setupDefinitions.map((setup) => (
                            <SelectItem key={setup.id} value={setup.id}>
                              {setup.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="rulebook-template">Template</Label>
                      <Select
                        value={form.journalTemplateId}
                        onValueChange={(value) =>
                          setForm((current) => ({ ...current, journalTemplateId: value }))
                        }
                      >
                        <SelectTrigger className="w-full" id="rulebook-template">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Any template</SelectItem>
                          {journalTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>

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

                  <FieldGroup
                    label="Rule Items"
                    meta={
                      <span style={{ color: "var(--text-tertiary)" }}>
                        Build the exact rules traders should mark as followed, broken, skipped, or not applicable.
                      </span>
                    }
                  >
                    <div className="space-y-3">
                      {form.items.map((item, index) => (
                        <InsetPanel key={`${editing?.id ?? "new"}-${index}`}>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold">Rule {index + 1}</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeRuleItem(index)}
                              >
                                Remove
                              </Button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <FieldGroup>
                                <Label htmlFor={`rule-item-title-${index}`}>Title</Label>
                                <Input
                                  id={`rule-item-title-${index}`}
                                  value={item.title}
                                  onChange={(event) =>
                                    setRuleItem(index, { title: event.target.value })
                                  }
                                />
                              </FieldGroup>
                              <FieldGroup>
                                <Label htmlFor={`rule-item-category-${index}`}>Category</Label>
                                <Input
                                  id={`rule-item-category-${index}`}
                                  value={item.category}
                                  onChange={(event) =>
                                    setRuleItem(index, { category: event.target.value })
                                  }
                                />
                              </FieldGroup>
                              <FieldGroup>
                                <Label htmlFor={`rule-item-severity-${index}`}>Severity</Label>
                                <Input
                                  id={`rule-item-severity-${index}`}
                                  value={item.severity}
                                  onChange={(event) =>
                                    setRuleItem(index, { severity: event.target.value })
                                  }
                                />
                              </FieldGroup>
                              <div className="flex items-end">
                                <ChoiceChip
                                  active={item.isActive}
                                  onClick={() =>
                                    setRuleItem(index, { isActive: !item.isActive })
                                  }
                                >
                                  {item.isActive ? "Active" : "Inactive"}
                                </ChoiceChip>
                              </div>
                            </div>
                            <FieldGroup>
                              <Label htmlFor={`rule-item-description-${index}`}>Description</Label>
                              <Textarea
                                id={`rule-item-description-${index}`}
                                rows={3}
                                value={item.description}
                                onChange={(event) =>
                                  setRuleItem(index, { description: event.target.value })
                                }
                              />
                            </FieldGroup>
                          </div>
                        </InsetPanel>
                      ))}
                    </div>
                    <div className="mt-3">
                      <Button type="button" variant="outline" onClick={addRuleItem}>
                        <Plus className="h-4 w-4" />
                        Add Rule
                      </Button>
                    </div>
                  </FieldGroup>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Rulebook"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="space-y-4">
          <ControlSurface>
            <FieldGroup label="Search rulebooks">
              <div className="relative max-w-xl">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: "var(--text-tertiary)" }}
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search rulebooks, categories, or rule titles..."
                  className="pl-9"
                />
              </div>
            </FieldGroup>
          </ControlSurface>

          {error ? (
            <InsetPanel tone="warning">
              <p className="text-sm" style={{ color: "var(--warning-primary)" }}>
                {error}
              </p>
            </InsetPanel>
          ) : null}

          {loading ? (
            <LoadingPanel rows={4} />
          ) : filtered.length === 0 ? (
            <WidgetEmptyState
              title="No rulebooks yet"
              description="Create the discipline frameworks you want trades to be evaluated against."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filtered.map((ruleSet) => (
                <AppPanel key={ruleSet.id} className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{ruleSet.name}</p>
                      <p
                        className="mt-1 text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {ruleSet.description || "No description yet."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChoiceChip active={Boolean(ruleSet.isActive)}>{
                        ruleSet.isActive ? "Active" : "Inactive"
                      }</ChoiceChip>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          resetForm(ruleSet);
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleDelete(ruleSet.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span
                      className="rounded-full border px-2.5 py-1 font-semibold"
                      style={{
                        borderColor: "var(--accent-muted)",
                        background: "var(--accent-soft)",
                        color: "var(--accent-primary)",
                      }}
                    >
                      {getScopeLabel(ruleSet.scopeType as RuleSetScopeType)}
                    </span>
                    {ruleSet.playbookId ? (
                      <span className="rounded-full border px-2.5 py-1">
                        {findLabel(playbooks, ruleSet.playbookId, "Strategy")}
                      </span>
                    ) : null}
                    {ruleSet.setupDefinitionId ? (
                      <span className="rounded-full border px-2.5 py-1">
                        {findLabel(setupDefinitions, ruleSet.setupDefinitionId, "Setup")}
                      </span>
                    ) : null}
                    {ruleSet.journalTemplateId ? (
                      <span className="rounded-full border px-2.5 py-1">
                        {findLabel(journalTemplates, ruleSet.journalTemplateId, "Template")}
                      </span>
                    ) : null}
                    {ruleSet.propAccountId ? (
                      <span className="rounded-full border px-2.5 py-1">
                        {findLabel(accountOptions, ruleSet.propAccountId, "Account")}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {ruleSet.items.map((rule) => (
                      <InsetPanel key={rule.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{rule.title}</p>
                            {rule.description ? (
                              <p
                                className="mt-1 text-xs"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {rule.description}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {rule.category ? (
                              <span className="rounded-full border px-2 py-0.5">
                                {rule.category}
                              </span>
                            ) : null}
                            {rule.severity ? (
                              <span className="rounded-full border px-2 py-0.5">
                                {rule.severity}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </InsetPanel>
                    ))}
                  </div>
                </AppPanel>
              ))}
            </div>
          )}
        </div>
      </AppPanel>
    </div>
  );
}
