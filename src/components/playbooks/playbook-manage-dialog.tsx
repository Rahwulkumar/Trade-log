"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ChoiceChip,
  AppTextArea,
} from "@/components/ui/control-primitives";
import {
  getPlaybook,
  updatePlaybook,
  type Playbook,
} from "@/lib/api/client/playbooks";

interface PlaybookManageDialogProps {
  playbookId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (playbook: Playbook) => void;
}

interface ManageFormState {
  name: string;
  description: string;
  rules: string;
  isActive: boolean;
}

const EMPTY_FORM: ManageFormState = {
  name: "",
  description: "",
  rules: "",
  isActive: true,
};

function normalizeRules(value: unknown) {
  if (!Array.isArray(value)) return "";

  return value
    .filter((item): item is string => typeof item === "string")
    .join("\n");
}

export function PlaybookManageDialog({
  playbookId,
  open,
  onOpenChange,
  onSaved,
}: PlaybookManageDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ManageFormState>(EMPTY_FORM);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!open || !playbookId) return;

      try {
        setLoading(true);
        setError(null);

        const playbook = await getPlaybook(playbookId);
        if (!playbook) {
          throw new Error("Playbook not found.");
        }

        if (!active) return;

        setForm({
          name: playbook.name,
          description: playbook.description ?? "",
          rules: normalizeRules(playbook.rules),
          isActive: playbook.isActive ?? true,
        });
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load playbook.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [open, playbookId]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setLoading(false);
      setSaving(false);
      setForm(EMPTY_FORM);
    }
  }, [open]);

  const parsedRules = useMemo(
    () =>
      form.rules
        .split("\n")
        .map((rule) => rule.trim())
        .filter(Boolean),
    [form.rules],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!playbookId || !form.name.trim()) {
      setError("Please enter a playbook name.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updated = await updatePlaybook(playbookId, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        rules: parsedRules,
        isActive: form.isActive,
      });

      onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update playbook.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Manage Playbook</DialogTitle>
          <DialogDescription>
            Update the setup name, rules, and activation state for this
            strategy template.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2
              className="h-5 w-5 animate-spin"
              style={{ color: "var(--text-tertiary)" }}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div
                className="rounded-[var(--radius-md)] border px-3 py-2 text-sm"
                style={{
                  background: "var(--loss-bg)",
                  borderColor: "var(--loss-primary)",
                  color: "var(--loss-primary)",
                }}
              >
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="manage-playbook-name">Playbook Name</Label>
              <Input
                id="manage-playbook-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="e.g. New York pullback continuation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manage-playbook-description">Description</Label>
              <AppTextArea
                id="manage-playbook-description"
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Describe the market context, trigger, and intent behind this playbook."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manage-playbook-rules">Rules</Label>
              <AppTextArea
                id="manage-playbook-rules"
                rows={6}
                value={form.rules}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, rules: event.target.value }))
                }
                placeholder={"Liquidity sweep confirmed\nBreak of structure\nRisk <= 1%"}
              />
              <p
                className="text-[0.72rem]"
                style={{ color: "var(--text-tertiary)" }}
              >
                One rule per line. {parsedRules.length} rule
                {parsedRules.length === 1 ? "" : "s"} detected.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2">
                <ChoiceChip
                  active={form.isActive}
                  onClick={() =>
                    setForm((prev) => ({ ...prev, isActive: true }))
                  }
                  activeColor="var(--profit-primary)"
                  activeBackground="var(--profit-bg)"
                  activeBorderColor="var(--profit-primary)"
                >
                  Active
                </ChoiceChip>
                <ChoiceChip
                  active={!form.isActive}
                  onClick={() =>
                    setForm((prev) => ({ ...prev, isActive: false }))
                  }
                  activeColor="var(--warning-primary)"
                  activeBackground="var(--warning-bg)"
                  activeBorderColor="var(--warning-primary)"
                >
                  Paused
                </ChoiceChip>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
