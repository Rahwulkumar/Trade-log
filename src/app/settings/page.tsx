"use client";

import { useState, useEffect, useMemo } from "react";
import { Download, Monitor, Moon, ShieldCheck, Sun, Trash2 } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
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
    return <p className="text-sm text-muted-foreground">Saving…</p>;
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
  const supabaseEnabled = false;

  // Profile form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [timezone, setTimezone] = useState("utc");
  const [profileSaveStatus, setProfileSaveStatus] =
    useState<SaveStatus>("idle");
  const [profileSaveError, setProfileSaveError] = useState("");

  // Password form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaveStatus, setPasswordSaveStatus] =
    useState<SaveStatus>("idle");
  const [passwordSaveError, setPasswordSaveError] = useState("");

  // Trading settings state
  const [defaultRisk, setDefaultRisk] = useState("1");
  const [defaultRR, setDefaultRR] = useState("2");
  const [defaultTimeframe, setDefaultTimeframe] = useState("h4");
  const [tradingSaveStatus, setTradingSaveStatus] =
    useState<SaveStatus>("idle");
  const [tradingSaveError, setTradingSaveError] = useState("");

  // Notifications state
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weeklyReport: true,
    drawdownAlert: true,
  });

  // Activity log state
  type AuditLog = { id: string; action: string; created_at: string; metadata: Record<string, unknown> | null };
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!supabaseEnabled) {
      setAuditLogs([]);
      setAuditLoading(false);
      return;
    }

    const supabase = createClient();
    setAuditLoading(true);
    supabase
      .from("audit_logs")
      .select("id, action, created_at, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setAuditLogs((data as AuditLog[]) ?? []);
        setAuditLoading(false);
      });
  }, [supabaseEnabled, user]);

  // Sync form from profile when it loads
  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setLastName(profile.last_name ?? "");
    setTimezone(profile.timezone ?? "utc");
    setDefaultRisk(String(profile.default_risk_percent ?? 1));
    setDefaultRR(String(profile.default_rr_ratio ?? 2));
  }, [profile]);

  const avatarInitials = useMemo(() => {
    const f = firstName.trim();
    const l = lastName.trim();
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "?";
  }, [firstName, lastName, user]);

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
    if (!supabaseEnabled) {
      setProfileSaveError("Profile settings are now managed outside Supabase.");
      setProfileSaveStatus("error");
      return;
    }

    setProfileSaveStatus("saving");
    setProfileSaveError("");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          timezone,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setProfileSaveStatus("saved");
      setTimeout(() => setProfileSaveStatus("idle"), 3000);
    } catch (err) {
      setProfileSaveError(err instanceof Error ? err.message : "Unknown error");
      setProfileSaveStatus("error");
    }
  }

  async function handleUpdatePassword() {
    if (!newPassword) return;
    if (!supabaseEnabled) {
      setPasswordSaveStatus("error");
      setPasswordSaveError("Password updates are now managed outside Supabase.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordSaveStatus("error");
      setPasswordSaveError("Passwords do not match.");
      return;
    }
    setPasswordSaveStatus("saving");
    setPasswordSaveError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaveStatus("saved");
      setTimeout(() => setPasswordSaveStatus("idle"), 3000);
    } catch (err) {
      setPasswordSaveError(
        err instanceof Error ? err.message : "Unknown error",
      );
      setPasswordSaveStatus("error");
    }
  }

  async function handleSaveTrading() {
    if (!user) return;
    if (!supabaseEnabled) {
      setTradingSaveError("Trading defaults are now managed outside Supabase.");
      setTradingSaveStatus("error");
      return;
    }

    setTradingSaveStatus("saving");
    setTradingSaveError("");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          default_risk_percent: parseFloat(defaultRisk) || null,
          default_rr_ratio: parseFloat(defaultRR) || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setTradingSaveStatus("saved");
      setTimeout(() => setTradingSaveStatus("idle"), 3000);
    } catch (err) {
      setTradingSaveError(err instanceof Error ? err.message : "Unknown error");
      setTradingSaveStatus("error");
    }
  }

  return (
    <div className="page-root page-sections">
      <AppPageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage profile, trading preferences, notifications, and data controls."
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-2 rounded-md border border-border bg-card p-1">
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
                <p className="mt-2 text-xs text-muted-foreground">
                  JPG, PNG, or GIF. Max file size 2MB.
                </p>
              </div>
            </div>

            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  value={lastName}
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
              <p className="text-xs text-muted-foreground">
                Email changes are managed through your authentication provider.
              </p>
            </div>

            <div className="mb-6 space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
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
              title="Password"
              subtitle="Change your password to keep your account secure."
            />

            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleUpdatePassword}
                disabled={passwordSaveStatus === "saving" || !newPassword}
              >
                Update Password
              </Button>
              <SaveFeedback
                status={passwordSaveStatus}
                errorMessage={passwordSaveError}
              />
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
                  className={cn(
                    "rounded-md border p-4 text-center transition-colors",
                    theme === value
                      ? "border-accent-primary bg-accent/70"
                      : "border-border hover:bg-accent/40",
                  )}
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
                    <p className="text-sm text-muted-foreground">
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
                  value={defaultRisk}
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
                  value={defaultRR}
                  onChange={(e) => setDefaultRR(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-6 space-y-2">
              <Label htmlFor="default-timeframe">Default Timeframe</Label>
              <Select
                value={defaultTimeframe}
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
            {auditLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 rounded-md skeleton" />
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-[0.75rem] py-4 text-center" style={{ color: "var(--text-tertiary)" }}>
                No activity recorded yet.
              </p>
            ) : (
              <div className="space-y-1">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] text-[0.72rem]"
                    style={{ background: "var(--surface-elevated)" }}
                  >
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                      {log.action}
                    </span>
                    <span className="mono" style={{ color: "var(--text-tertiary)" }}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-500/25 bg-red-500/10 p-4"
                >
                  <div>
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-red-500/35 text-red-300 hover:bg-red-500/20 hover:text-red-200"
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
