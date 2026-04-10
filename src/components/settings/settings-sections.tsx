"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  GripVertical,
  LogOut,
  Monitor,
  Moon,
  Plus,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChoiceChip, ControlSurface, FieldGroup } from "@/components/ui/control-primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppPanel, PanelTitle } from "@/components/ui/page-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InsetPanel, ListItemRow, WidgetEmptyState } from "@/components/ui/surface-primitives";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type SettingsTheme = "light" | "dark" | "system";

const THEME_OPTIONS: Array<{
  value: SettingsTheme;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

function SettingsSaveFeedback({
  status,
  errorMessage,
}: {
  status: SaveStatus;
  errorMessage?: string;
}) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
        Saving...
      </p>
    );
  }

  if (status === "saved") {
    return (
      <p className="text-sm" style={{ color: "var(--profit-primary)" }}>
        Saved.
      </p>
    );
  }

  return (
    <p className="text-sm" style={{ color: "var(--loss-primary)" }}>
      {errorMessage ?? "Failed to save."}
    </p>
  );
}

export function SettingsProfilePanels({
  avatarUrl,
  avatarInitials,
  displayName,
  email,
  resolvedFirstName,
  resolvedLastName,
  resolvedTimezone,
  saveStatus,
  saveError,
  canSave,
  onFirstNameChange,
  onLastNameChange,
  onTimezoneChange,
  onSave,
  onManageSecurity,
  onSignOut,
}: {
  avatarUrl: string | null;
  avatarInitials: string;
  displayName: string;
  email: string;
  resolvedFirstName: string;
  resolvedLastName: string;
  resolvedTimezone: string;
  saveStatus: SaveStatus;
  saveError: string;
  canSave: boolean;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onSave: () => void;
  onManageSecurity: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <AppPanel>
        <PanelTitle
          title="Profile Information"
          subtitle="Update the name and timezone used across your journal, analytics, and reports."
        />

        <InsetPanel className="mb-5">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="h-16 w-16 border border-border-subtle">
              <AvatarImage src={avatarUrl ?? ""} alt="User profile" />
              <AvatarFallback className="text-lg font-semibold">
                {avatarInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p
                className="truncate text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {email}
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                Profile photo, email, and sign-in credentials are managed by your authentication provider.
              </p>
            </div>
          </div>
        </InsetPanel>

        <ControlSurface>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input
                id="first-name"
                value={resolvedFirstName}
                onChange={(event) => onFirstNameChange(event.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input
                id="last-name"
                value={resolvedLastName}
                onChange={(event) => onLastNameChange(event.target.value)}
                placeholder="Last name"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={resolvedTimezone} onValueChange={onTimezoneChange}>
                <SelectTrigger id="timezone" className="max-w-[280px]">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc-4">UTC-4 (Trading Default)</SelectItem>
                  <SelectItem value="utc">UTC (GMT+0)</SelectItem>
                  <SelectItem value="est">Eastern Time (DST-aware)</SelectItem>
                  <SelectItem value="pst">Pacific Time (GMT-8)</SelectItem>
                  <SelectItem value="ist">India Standard Time (GMT+5:30)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ControlSurface>

        <div className="mt-4 flex items-center gap-4">
          <Button onClick={onSave} disabled={!canSave || statusIsSaving(saveStatus)}>
            Save Changes
          </Button>
          <SettingsSaveFeedback status={saveStatus} errorMessage={saveError} />
        </div>
      </AppPanel>

      <AppPanel>
        <PanelTitle
          title="Password & Security"
          subtitle="Authentication and session controls are managed in your account portal."
        />

        <ListItemRow
          leading={
            <div>
              <p className="text-sm font-medium">Manage authentication settings</p>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--text-tertiary)" }}
              >
                Update your password, active sessions, MFA, and account identity from the Clerk portal.
              </p>
            </div>
          }
          trailing={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={onManageSecurity}>
                Manage Security
              </Button>
              <Button variant="outline" onClick={onSignOut}>
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </div>
          }
        />
      </AppPanel>
    </>
  );
}

export function SettingsAppearancePanels({
  theme,
  onThemeChange,
}: {
  theme: SettingsTheme;
  onThemeChange: (value: SettingsTheme) => void;
}) {
  return (
    <>
      <AppPanel>
        <PanelTitle
          title="Theme"
          subtitle="Choose how the interface is rendered across the product."
        />

        <ControlSurface>
          <FieldGroup label="Color Theme">
            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
                <ChoiceChip
                  key={value}
                  active={theme === value}
                  onClick={() => onThemeChange(value)}
                  icon={<Icon className="h-4 w-4" />}
                >
                  {label}
                </ChoiceChip>
              ))}
            </div>
          </FieldGroup>
        </ControlSurface>
      </AppPanel>

      <AppPanel>
        <PanelTitle
          title="Display Defaults"
          subtitle="Cross-page metric display defaults are not account-level settings yet."
        />

        <InsetPanel tone="accent">
          <p className="text-sm font-medium">Metric views still live inside each surface.</p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            Dashboard and analytics currently manage ranges and display modes at the page level. When a real account-wide default exists, it will be configured here.
          </p>
        </InsetPanel>
      </AppPanel>
    </>
  );
}

export function SettingsTradingPanels({
  resolvedDefaultRisk,
  resolvedDefaultRR,
  resolvedDefaultTimeframe,
  tradingSaveStatus,
  tradingSaveError,
  rulesSaveStatus,
  rulesSaveError,
  resolvedRules,
  newRuleText,
  canSaveTrading,
  onDefaultRiskChange,
  onDefaultRRChange,
  onDefaultTimeframeChange,
  onSaveTrading,
  onNewRuleTextChange,
  onAddRule,
  onMoveRule,
  onDeleteRule,
}: {
  resolvedDefaultRisk: string;
  resolvedDefaultRR: string;
  resolvedDefaultTimeframe: string;
  tradingSaveStatus: SaveStatus;
  tradingSaveError: string;
  rulesSaveStatus: SaveStatus;
  rulesSaveError: string;
  resolvedRules: string[];
  newRuleText: string;
  canSaveTrading: boolean;
  onDefaultRiskChange: (value: string) => void;
  onDefaultRRChange: (value: string) => void;
  onDefaultTimeframeChange: (value: string) => void;
  onSaveTrading: () => void;
  onNewRuleTextChange: (value: string) => void;
  onAddRule: () => void;
  onMoveRule: (index: number, direction: -1 | 1) => void;
  onDeleteRule: (index: number) => void;
}) {
  return (
    <>
      <AppPanel>
        <PanelTitle
          title="Default Trading Settings"
          subtitle="Set the baseline values used when you create new trades and journal reviews."
        />

        <ControlSurface>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="default-risk">Default Risk %</Label>
              <Input
                id="default-risk"
                type="number"
                step="0.1"
                min="0"
                value={resolvedDefaultRisk}
                onChange={(event) => onDefaultRiskChange(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-rr">Default R:R Ratio</Label>
              <Input
                id="default-rr"
                type="number"
                step="0.5"
                min="0"
                value={resolvedDefaultRR}
                onChange={(event) => onDefaultRRChange(event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="default-timeframe">Default Timeframe</Label>
              <Select
                value={resolvedDefaultTimeframe}
                onValueChange={onDefaultTimeframeChange}
              >
                <SelectTrigger id="default-timeframe" className="max-w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="m15">M15</SelectItem>
                  <SelectItem value="m30">M30</SelectItem>
                  <SelectItem value="h1">H1</SelectItem>
                  <SelectItem value="h4">H4</SelectItem>
                  <SelectItem value="d1">D1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ControlSurface>

        <div className="mt-4 flex items-center gap-4">
          <Button onClick={onSaveTrading} disabled={!canSaveTrading || statusIsSaving(tradingSaveStatus)}>
            Save Settings
          </Button>
          <SettingsSaveFeedback
            status={tradingSaveStatus}
            errorMessage={tradingSaveError}
          />
        </div>
      </AppPanel>

      <AppPanel>
        <PanelTitle
          title="Universal Trading Rules"
          subtitle="Rules that apply to every trade and should be enforced across your journal."
        />

        <ControlSurface className="mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-rule">Add a rule</Label>
              <Input
                id="new-rule"
                placeholder="e.g. Never risk more than 1% per trade"
                value={newRuleText}
                onChange={(event) => onNewRuleTextChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onAddRule();
                  }
                }}
                maxLength={300}
              />
            </div>
            <Button
              variant="outline"
              onClick={onAddRule}
              disabled={!newRuleText.trim()}
            >
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </div>
        </ControlSurface>

        {resolvedRules.length === 0 ? (
          <WidgetEmptyState
            title="No trading rules yet"
            description="Add the rules you want enforced across every setup, account, and journal entry."
          />
        ) : (
          <div className="space-y-3">
            {resolvedRules.map((rule, index) => (
              <ListItemRow
                key={`${rule}-${index}`}
                leading={
                  <div className="flex items-start gap-3">
                    <GripVertical
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <p className="text-sm leading-snug">{rule}</p>
                  </div>
                }
                trailing={
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onMoveRule(index, -1)}
                      disabled={index === 0}
                      aria-label="Move rule up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onMoveRule(index, 1)}
                      disabled={index === resolvedRules.length - 1}
                      aria-label="Move rule down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDeleteRule(index)}
                      aria-label="Delete rule"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        )}

        <div className="mt-4">
          <SettingsSaveFeedback
            status={rulesSaveStatus}
            errorMessage={rulesSaveError}
          />
        </div>
      </AppPanel>
    </>
  );
}

export function SettingsDataPanels({
  canDownloadSettings,
  onDownloadSettings,
}: {
  canDownloadSettings: boolean;
  onDownloadSettings: () => void;
}) {
  return (
    <>
      <AppPanel>
        <PanelTitle
          title="Reports & Exports"
          subtitle="Use the reports surface for performance exports and download your account preferences here."
        />

        <ControlSurface>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={onDownloadSettings}
              disabled={!canDownloadSettings}
            >
              <Download className="h-4 w-4" />
              Download Settings JSON
            </Button>
            <Button asChild variant="outline">
              <Link href="/reports">
                <ExternalLink className="h-4 w-4" />
                Open Reports
              </Link>
            </Button>
          </div>
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            Performance and account exports live in Reports. The settings backup contains your saved profile defaults and universal trading rules.
          </p>
        </ControlSurface>
      </AppPanel>

      <AppPanel>
        <PanelTitle
          title="Activity Log"
          subtitle="Security and account history will return once the audit log migration is complete."
        />

        <InsetPanel tone="accent">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className="h-4 w-4"
              style={{ color: "var(--accent-primary)" }}
            />
            <p className="text-sm font-medium">Security history is temporarily unavailable.</p>
          </div>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            We removed the static placeholder feed. This section will come back when the audit log is fully migrated to Clerk-backed identities.
          </p>
        </InsetPanel>
      </AppPanel>

      <AppPanel>
        <PanelTitle
          title="Danger Zone"
          subtitle="Destructive account actions stay hidden until they are backed by verified server-side flows."
        />

        <InsetPanel tone="loss">
          <div className="flex items-center gap-2">
            <Trash2
              className="h-4 w-4"
              style={{ color: "var(--loss-primary)" }}
            />
            <p className="text-sm font-medium">Destructive actions are not available here.</p>
          </div>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            The old delete buttons were removed because they were not connected to real account-deletion flows. When these actions return, they will require explicit backend confirmation and dedicated dialogs.
          </p>
        </InsetPanel>
      </AppPanel>
    </>
  );
}

function statusIsSaving(status: SaveStatus) {
  return status === "saving";
}
