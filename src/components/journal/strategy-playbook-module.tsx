// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { Plus, Loader2, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPlaybook } from "@/lib/api/client/playbooks";
import type { Playbook as SchemaPlaybook } from "@/lib/db/schema";

/** Playbook with JSON fields narrowed for UI (rules as string[], description as string) */
type Playbook = Omit<SchemaPlaybook, "rules" | "description"> & {
  rules: string[] | null;
  description: string | null;
};

interface StrategyPlaybookModuleProps {
  playbooks: Playbook[];
  selectedPlaybookId: string | null;
  checkedRules: string[];
  onPlaybookChange: (playbookId: string | null) => void;
  onCheckedRulesChange: (checked: string[]) => void;
  onPlaybooksRefetch: () => Promise<void>;
  className?: string;
}

export function StrategyPlaybookModule({
  playbooks,
  selectedPlaybookId,
  checkedRules,
  onPlaybookChange,
  onCheckedRulesChange,
  onPlaybooksRefetch,
  className,
}: StrategyPlaybookModuleProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    rules: "",
  });

  const selectedPlaybook = useMemo(
    () => playbooks.find((p) => p.id === selectedPlaybookId) ?? null,
    [playbooks, selectedPlaybookId],
  );

  const rules = (selectedPlaybook?.rules as string[] | null) ?? [];

  const strategySelectNode = (
    <Select
      value={selectedPlaybookId ?? "no-selection"}
      onValueChange={(val) =>
        onPlaybookChange(val === "no-selection" ? null : val)
      }
    >
      <SelectTrigger className="w-full h-auto p-0 border-0 bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg]:hidden">
        {selectedPlaybook ? (
          <div
            className="w-full flex flex-col gap-2 p-4 rounded-xl transition-all cursor-pointer"
            style={{
              border: "1px solid var(--border-active)",
              background: "var(--accent-soft)",
              boxShadow: "0 0 15px -3px var(--accent-glow)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: "var(--accent-primary)",
                    boxShadow: "0 0 8px var(--accent-glow)",
                  }}
                />
                <span
                  className="text-[10px] uppercase tracking-widest font-semibold"
                  style={{ color: "var(--accent-secondary)" }}
                >
                  Active Protocol
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground/50">
                Click to change
              </span>
            </div>
            <div
              className="text-lg font-bold tracking-tight font-sans"
              style={{ color: "var(--text-primary)" }}
            >
              {selectedPlaybook.name}
            </div>
            {selectedPlaybook.description ? (
              <div className="text-xs text-muted-foreground line-clamp-2">
                {selectedPlaybook.description}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed border-border bg-muted/20 hover:bg-muted/30 transition-all cursor-pointer group-hover:border-foreground/20">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select Strategy
            </span>
          </div>
        )}
      </SelectTrigger>
      <SelectContent align="start" className="w-[300px]">
        <SelectItem value="no-selection" className="text-muted-foreground">
          No Protocol
        </SelectItem>
        {playbooks.map((p) => (
          <SelectItem
            key={p.id}
            value={p.id}
            className="font-mono text-xs py-2"
          >
            <div className="flex flex-col gap-0.5 text-left">
              <span className="font-semibold text-foreground">
                {p.name}
              </span>
              {p.description ? (
                <span className="text-[10px] text-muted-foreground line-clamp-1">
                  {p.description}
                </span>
              ) : null}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) as React.ReactNode;

  const isRuleChecked = (rule: string) =>
    checkedRules.includes(rule) ||
    checkedRules.some((c) => c.trim() === rule.trim());

  const toggleRule = (rule: string) => {
    if (isRuleChecked(rule)) {
      onCheckedRulesChange(
        checkedRules.filter((r) => r !== rule && r.trim() !== rule.trim()),
      );
    } else {
      onCheckedRulesChange([...checkedRules, rule]);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setCreateSubmitting(true);
    try {
      const ruleList = createForm.rules
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);
      const created = await createPlaybook({
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        rules: ruleList.length > 0 ? ruleList : null,
        isActive: true,
      });
      await onPlaybooksRefetch();
      onPlaybookChange(created.id);
      setCreateOpen(false);
      setCreateForm({ name: "", description: "", rules: "" });
    } catch {
      setCreateSubmitting(false);
    }
    setCreateSubmitting(false);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-muted-foreground/70">
          Strategy Protocol
        </Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-muted"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Strategy Protocol Keycard */}
      <div className="relative group">
        {strategySelectNode}
      </div>

      {(selectedPlaybook as unknown as Record<string, unknown>)?.ai_generated &&
        (selectedPlaybook as unknown as Record<string, unknown>)?.ai_prompt && (
          <div
            className="rounded-md overflow-hidden"
            style={{
              border: "1px solid var(--border-active)",
              background: "var(--accent-soft)",
            }}
          >
            <button
              type="button"
              onClick={() => setAiOpen((o) => !o)}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-[10px] uppercase tracking-wider transition-colors"
              style={{ color: "var(--accent-secondary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--accent-muted)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform",
                  aiOpen && "rotate-180",
                )}
              />
              <span>AI Logic Insight</span>
            </button>
            {aiOpen && (
              <div
                className="px-3 py-2 text-xs whitespace-pre-wrap font-mono leading-relaxed"
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                  background: "var(--surface-elevated)",
                }}
              >
                {
                  (selectedPlaybook as unknown as Record<string, string>)
                    .ai_prompt
                }
              </div>
            )}
          </div>
        )}

      {rules.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Checklist
            </span>
            <span className="text-[10px] text-profit font-mono">
              {checkedRules.length}/{rules.length}
            </span>
          </div>
          <div className="space-y-1">
            {rules.map((rule, i) => {
              const isChecked = isRuleChecked(rule);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleRule(rule)}
                  className={cn(
                    "w-full flex items-start gap-3 p-2 rounded text-left transition-all duration-200 group border border-transparent",
                    isChecked
                      ? "bg-profit/10 border-profit/20"
                      : "hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-all",
                      isChecked
                        ? "bg-profit border-profit text-white"
                        : "border-border group-hover:border-foreground/20",
                    )}
                  >
                    {isChecked && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span
                    className={cn(
                      "text-xs leading-relaxed transition-colors",
                      isChecked
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {rule}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        selectedPlaybook && (
          <p className="text-xs text-muted-foreground italic text-center py-4">
            No strict rules defined.
          </p>
        )
      )}

      {!selectedPlaybook && (
        <div className="py-8 text-center border border-dashed border-border rounded-md">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Select a Protocol
          </p>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>New Strategy</DialogTitle>
              <DialogDescription>
                Define a reusable set of rules.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sp-name">Name</Label>
                <Input
                  id="sp-name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-desc">Description</Label>
                <Textarea
                  id="sp-desc"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-rules">Rules (one per line)</Label>
                <Textarea
                  id="sp-rules"
                  rows={4}
                  value={createForm.rules}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, rules: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Create Strategy"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
