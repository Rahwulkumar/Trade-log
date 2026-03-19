"use client";

import { useState, useMemo, useCallback } from "react";
import { Download, GripVertical, Monitor, Moon, Plus, ShieldCheck, Sun, Trash2, X } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/components/auth-provider";
import { updateCurrentUserProfile } from "@/lib/api/client/profile";
import {
  AppPageHeader,
  AppPanel,
  PanelTitle,
} from "@/components/ui/page-primitives";

const SETTINGS_TABS = [
  { id: "profile", label: "Profile" },
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
  { id: "trading", label: "Trading" },
  { id: "data", label: "Data" },
] as const;

const THEME_OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

const NOTIFICATION_OPTIONS = [
  {
    key: "email",
    label: "Email Notifications",
    description: "Receive account and workflow updates by email.",
  },
  {
    key: "push",
    label: "Push Notifications",
    description: "Send browser notifications for important events.",
  },
  {
    key: "weeklyReport",
    label: "Weekly Report",
    description: "Get a summary of your weekly performance.",
  },
  {
    key: "drawdownAlert",
    label: "Drawdown Alerts",
    description: "Alert when account drawdown approaches limits.",
  },
] as const;

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveFeedback({
  status,
  errorMessage,
}: {
  status: SaveStatus;
  errorMessage?: string;
}) {
  if (status === "idle") return null;
  if (status === "saving")
    return <p style={{ color: "var(--text-tertiary)" }} className="text-sm">Saving…</p>;
  if (status === "saved")
    return <p className="text-sm text-[var(--profit-primary)]">Saved.</p>;
  return (
    <p className="text-sm text-[var(--loss-primary)]">
      {errorMessage ?? "Failed to save."}
    </p>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const { openUserProfile } = useClerk();

  // Profile form state
  const [firstName, setFirstName] = useState<string | undefined>(undefined);
  const [lastName, setLastName] = useState<string | undefined>(undefined);
  const [timezone, setTimezone] = useState<string | undefined>(undefined);
  const [profileSaveStatus, setProfileSaveStatus] =
    useState<SaveStatus>("idle");
  const [profileSaveError, setProfileSaveError] = useState("");

  // Trading settings state
  const [defaultRisk, setDefaultRisk] = useState<string | undefined>(undefined);
  const [defaultRR, setDefaultRR] = useState<string | undefined>(undefined);
  const [defaultTimeframe, setDefaultTimeframe] = useState<string | undefined>(undefined);
  const [tradingSaveStatus, setTradingSaveStatus] =
    useState<SaveStatus>("idle");
  const [tradingSaveError, setTradingSaveError] = useState("");

  // Trading Rules state
  const [tradingRules, setTradingRules] = useState<string[] | undefined>(undefined);
  const [newRuleText, setNewRuleText] = useState("");
  const [rulesSaveStatus, setRulesSaveStatus] = useState<SaveStatus>("idle");
  const [rulesSaveError, setRulesSaveError] = useState("");

  // Notifications state
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weeklyReport: true,
    drawdownAlert: true,
  });

  const resolvedRules = tradingRules ?? profile?.trading_rules ?? [];

  const saveRules = useCallback(async (rules: string[]) => {
    setRulesSaveStatus("saving");
    setRulesSaveError("");
    try {
      await updateCurrentUserProfile({ trading_rules: rules });
      await refreshProfile();
      setRulesSaveStatus("saved");
      setTimeout(() => setRulesSaveStatus("idle"), 2000);
    } catch (err) {
      setRulesSaveError(err instanceof Error ? err.message : "Unknown error");
      setRulesSaveStatus("error");
    }
  }, [refreshProfile]);

  function addRule() {
    const text = newRuleText.trim();
    if (!text) return;
    const next = [...resolvedRules, text];
    setTradingRules(next);
    setNewRuleText("");
    saveRules(next);
  }

  function deleteRule(index: number) {
    const next = resolvedRules.filter((_, i) => i !== index);
    setTradingRules(next);
    saveRules(next);
  }

  function moveRule(index: number, dir: -1 | 1) {
    const next = [...resolvedRules];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setTradingRules(next);
    saveRules(next);
  }

  const resolvedFirstName = firstName ?? profile?.first_name ?? "";
  const resolvedLastName = lastName ?? profile?.last_name ?? "";
  const resolvedTimezone = timezone ?? profile?.timezone ?? "utc";
  const resolvedDefaultRisk =
    defaultRisk ?? String(profile?.default_risk_percent ?? 1);
  const resolvedDefaultRR = defaultRR ?? String(profile?.default_rr_ratio ?? 2);
  const resolvedDefaultTimeframe =
    defaultTimeframe ?? profile?.default_timeframe ?? "h4";

  const avatarInitials = useMemo(() => {
    const f = resolvedFirstName.trim();
    const l = resolvedLastName.trim();
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "?";
  }, [resolvedFirstName, resolvedLastName, user]);

  const notificationRows = useMemo(
    () =>
      NOTIFICATION_OPTIONS.map((item) => ({
        ...item,
        enabled: notifications[item.key],
      })),
    [notifications],
  );

  async function handleSaveProfile() {
    if (!user) return;

    setProfileSaveStatus("saving");
    setProfileSaveError("");
    try {
      await updateCurrentUserProfile({
        first_name: resolvedFirstName.trim() || null,
        last_name: resolvedLastName.trim() || null,
        timezone: resolvedTimezone,
      });
      await refreshProfile();
      setFirstName(undefined);
      setLastName(undefined);
      setTimezone(undefined);
      setProfileSaveStatus("saved");
      setTimeout(() => setProfileSaveStatus("idle"), 3000);
    } catch (err) {
      setProfileSaveError(err instanceof Error ? err.message : "Unknown error");
      setProfileSaveStatus("error");
    }
  }

  async function handleSaveTrading() {
    if (!user) return;

    setTradingSaveStatus("saving");
    setTradingSaveError("");
    try {
      await updateCurrentUserProfile({
        default_risk_percent: Number.isFinite(parseFloat(resolvedDefaultRisk))
          ? parseFloat(resolvedDefaultRisk)
          : null,
        default_rr_ratio: Number.isFinite(parseFloat(resolvedDefaultRR))
          ? parseFloat(resolvedDefaultRR)
          : null,
        default_timeframe: resolvedDefaultTimeframe || null,
      });
      await refreshProfile();
      setDefaultRisk(undefined);
      setDefaultRR(undefined);
      setDefaultTimeframe(undefined);
      setTradingSaveStatus("saved");
      setTimeout(() => setTradingSaveStatus("idle"), 3000);
    } catch (err) {
      setTradingSaveError(err instanceof Error ? err.message : "Unknown error");
      setTradingSaveStatus("error");
    }
  }

  function handleManageSecurity() {
    openUserProfile();
  }

  return (
    <div className="page-root page-sections">
      <AppPageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage profile, trading preferences, notifications, and data controls."
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-2 rounded-md border p-1" style={{ background: "var(--surface)", borderColor: "var(--border-default)" }}>
          {SETTINGS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-md px-3 py-1.5 text-xs font-medium"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <AppPanel>
            <PanelTitle
              title="Profile Information"
              subtitle="Update your personal and account details."
            />

            <div className="mb-6 flex flex-wrap items-center gap-5">
              <Avatar className="h-20 w-20 border border-border-subtle">
                <AvatarImage
                  src={profile?.avatar_url ?? ""}
                  alt="User profile"
                />
                <AvatarFallback className="bg-accent text-accent-primary text-lg font-semibold">
                  {avatarInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm" disabled>
                  Change Photo
                </Button>
                <p className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  JPG, PNG, or GIF. Max file size 2MB.
                </p>
              </div>
            </div>

            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  value={resolvedFirstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  value={resolvedLastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="mb-4 space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email ?? ""}
                readOnly
                className="opacity-60 cursor-not-allowed"
              />
              <p style={{ color: "var(--text-tertiary)" }} className="text-xs">
                Email changes are managed through your authentication provider.
              </p>
            </div>

            <div className="mb-6 space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={resolvedTimezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone" className="max-w-[280px]">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC (GMT+0)</SelectItem>
                  <SelectItem value="est">Eastern Time (GMT-5)</SelectItem>
                  <SelectItem value="pst">Pacific Time (GMT-8)</SelectItem>
                  <SelectItem value="ist">
                    India Standard Time (GMT+5:30)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleSaveProfile}
                disabled={profileSaveStatus === "saving" || !user}
              >
                Save Changes
              </Button>
              <SaveFeedback
                status={profileSaveStatus}
                errorMessage={profileSaveError}
              />
            </div>
          </AppPanel>

          <AppPanel>
            <PanelTitle
              title="Password & Security"
              subtitle="Authentication and password changes are managed by Clerk."
            />

            <p style={{ color: "var(--text-tertiary)" }} className="mb-6 text-sm">
              Open the Clerk account portal to update your password, active
              sessions, and other authentication settings.
            </p>

            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleManageSecurity}>
                Manage Security
              </Button>
            </div>
          </AppPanel>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <AppPanel>
            <PanelTitle
              title="Theme"
              subtitle="Choose how the interface is rendered."
            />

            <div className="grid grid-cols-3 gap-4">
              {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className="rounded-md border p-4 text-center transition-colors"
                  style={
                    theme === value
                      ? { borderColor: "var(--accent-primary)", background: "var(--accent-muted)" }
                      : { borderColor: "var(--border-default)" }
                  }
                >
                  <Icon className="mx-auto mb-2 h-5 w-5" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </AppPanel>

          <AppPanel>
            <PanelTitle
              title="Dashboard View"
              subtitle="Select the default metric representation."
            />
            <Select defaultValue="dollars">
              <SelectTrigger className="max-w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dollars">Dollars ($)</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="rmultiple">R-Multiple</SelectItem>
                <SelectItem value="pips">Pips/Ticks</SelectItem>
              </SelectContent>
            </Select>
          </AppPanel>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <AppPanel>
            <PanelTitle
              title="Notification Preferences"
              subtitle="Configure when and how you receive alerts."
            />
            <div className="divide-y divide-border-subtle">
              {notificationRows.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p style={{ color: "var(--text-tertiary)" }} className="text-sm">
                      {item.description}
                    </p>
                  </div>
                  <Switch
                    checked={item.enabled}
                    onCheckedChange={(value) =>
                      setNotifications((prev) => ({
                        ...prev,
                        [item.key]: value,
                      }))
                    }
                    aria-label={item.label}
                  />
                </div>
              ))}
            </div>
          </AppPanel>
        </TabsContent>

        <TabsContent value="trading" className="space-y-6">
          <AppPanel>
            <PanelTitle
              title="Default Trading Settings"
              subtitle="Set baseline values for new trades and journal entries."
            />

            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="default-risk">Default Risk %</Label>
                <Input
                  id="default-risk"
                  type="number"
                  step="0.1"
                  min="0"
                  value={resolvedDefaultRisk}
                  onChange={(e) => setDefaultRisk(e.target.value)}
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
                  onChange={(e) => setDefaultRR(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-6 space-y-2">
              <Label htmlFor="default-timeframe">Default Timeframe</Label>
              <Select
                value={resolvedDefaultTimeframe}
                onValueChange={setDefaultTimeframe}
              >
                <SelectTrigger id="default-timeframe" className="max-w-[200px]">
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

            <div className="flex items-center gap-4">
              <Button
                onClick={handleSaveTrading}
                disabled={tradingSaveStatus === "saving" || !user}
              >
                Save Settings
              </Button>
              <SaveFeedback
                status={tradingSaveStatus}
                errorMessage={tradingSaveError}
              />
            </div>
          </AppPanel>
          <AppPanel>
            <PanelTitle
              title="Universal Trading Rules"
              subtitle="Rules that apply to every trade, regardless of strategy. Shown in your daily plan checklist."
            />

            {/* Add new rule */}
            <div className="mb-4 flex gap-2">
              <Input
                placeholder="e.g. Never risk more than 1% per trade"
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRule()}
                maxLength={300}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={addRule}
                disabled={!newRuleText.trim()}
                aria-label="Add rule"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Rules list */}
            {resolvedRules.length === 0 ? (
              <p className="py-4 text-center text-[0.75rem]" style={{ color: "var(--text-tertiary)" }}>
                No rules yet. Add your first rule above.
              </p>
            ) : (
              <ol className="space-y-2">
                {resolvedRules.map((rule, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5"
                    style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
                  >
                    <GripVertical className="h-4 w-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                    <span className="flex-1 text-sm leading-snug">{rule}</span>
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveRule(i, -1)}
                        disabled={i === 0}
                        className="rounded p-1 transition-colors disabled:opacity-25"
                        style={{ color: "var(--text-secondary)" }}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRule(i, 1)}
                        disabled={i === resolvedRules.length - 1}
                        className="rounded p-1 transition-colors disabled:opacity-25"
                        style={{ color: "var(--text-secondary)" }}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRule(i)}
                        className="rounded p-1 transition-colors"
                        style={{ color: "var(--text-tertiary)" }}
                        aria-label="Delete rule"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-4">
              <SaveFeedback status={rulesSaveStatus} errorMessage={rulesSaveError} />
            </div>
          </AppPanel>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <AppPanel>
            <PanelTitle
              title="Export Data"
              subtitle="Download your account history and analytics snapshots."
            />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Trades (CSV)
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Analytics (PDF)
              </Button>
            </div>
          </AppPanel>

          {/* Activity Log */}
          <AppPanel>
            <PanelTitle
              title="Activity Log"
              subtitle="Your last 20 account actions and login events."
            />
            <div className="flex items-center gap-2 mb-3" style={{ color: "var(--accent-primary)" }}>
              <ShieldCheck size={14} />
              <span className="text-[0.68rem] font-semibold uppercase tracking-wider">Security History</span>
            </div>
            <p className="text-[0.75rem] py-4 text-center" style={{ color: "var(--text-tertiary)" }}>
              Activity history will return once the legacy audit log table is migrated to Clerk user IDs.
            </p>
          </AppPanel>

          <section
            className="rounded-[var(--radius-lg)] p-6"
            style={{
              border: "1px solid var(--loss-primary)",
              background: "rgba(224,82,90,0.04)",
            }}
          >
            <PanelTitle
              title="Danger Zone"
              subtitle="These actions are permanent and irreversible."
            />

            <div className="space-y-4">
              {[
                {
                  title: "Delete All Trades",
                  description: "Permanently remove all trade records.",
                },
                {
                  title: "Delete Account",
                  description: "Remove your profile and all stored data.",
                },
              ].map((action) => (
                <div
                  key={action.title}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"
                  style={{ borderColor: "rgba(224, 82, 90, 0.25)", background: "var(--loss-bg)" }}
                >
                  <div>
                    <p className="font-medium">{action.title}</p>
                    <p style={{ color: "var(--text-tertiary)" }} className="text-sm">
                      {action.description}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="btn-danger-zone"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
