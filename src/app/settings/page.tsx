"use client";

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useClerk } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import {
  SaveStatus,
  SettingsAppearancePanels,
  SettingsDataPanels,
  SettingsProfilePanels,
  SettingsTradingPanels,
  type SettingsTheme,
} from "@/components/settings/settings-sections";
import { Button } from "@/components/ui/button";
import {
  AppPageHeader,
  AppPanelEmptyState,
} from "@/components/ui/page-primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/components/theme-provider";
import { updateCurrentUserProfile } from "@/lib/api/client/profile";

const SETTINGS_TABS = [
  { id: "profile", label: "Profile" },
  { id: "appearance", label: "Appearance" },
  { id: "trading", label: "Trading" },
  { id: "data", label: "Data" },
] as const;

type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

const DEFAULT_TAB: SettingsTabId = "profile";

function isSettingsTab(value: string | null): value is SettingsTabId {
  return SETTINGS_TABS.some((tab) => tab.id === value);
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <>
          <AppPageHeader
            eyebrow="Account"
            title="Settings"
            description="Manage profile, trading preferences, and data controls."
          />
          <AppPanelEmptyState
            title="Loading settings"
            description="Preparing your account preferences."
            minHeight={180}
          />
        </>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}

function SettingsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { user, profile, refreshProfile, loading, isConfigured, isLoaded, isSignedIn } =
    useAuth();
  const { openUserProfile } = useClerk();

  const resetTimersRef = useRef<
    Partial<Record<"profile" | "trading" | "rules", number>>
  >({});

  useEffect(() => {
    const timers = resetTimersRef.current;
    return () => {
      Object.values(timers).forEach((timerId) => {
        if (timerId) {
          window.clearTimeout(timerId);
        }
      });
    };
  }, []);

  const scheduleReset = useCallback(
    (
      key: "profile" | "trading" | "rules",
      setter: (status: SaveStatus) => void,
      delay: number,
    ) => {
      const existing = resetTimersRef.current[key];
      if (existing) {
        window.clearTimeout(existing);
      }

      resetTimersRef.current[key] = window.setTimeout(() => {
        setter("idle");
        delete resetTimersRef.current[key];
      }, delay);
    },
    [],
  );

  const activeTab = useMemo<SettingsTabId>(() => {
    const tab = searchParams.get("tab");
    return isSettingsTab(tab) ? tab : DEFAULT_TAB;
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
      if (!isSettingsTab(value)) return;

      const params = new URLSearchParams(searchParams.toString());
      if (value === DEFAULT_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", value);
      }

      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [firstName, setFirstName] = useState<string | undefined>(undefined);
  const [lastName, setLastName] = useState<string | undefined>(undefined);
  const [timezone, setTimezone] = useState<string | undefined>(undefined);
  const [profileSaveStatus, setProfileSaveStatus] =
    useState<SaveStatus>("idle");
  const [profileSaveError, setProfileSaveError] = useState("");

  const [defaultRisk, setDefaultRisk] = useState<string | undefined>(undefined);
  const [defaultRR, setDefaultRR] = useState<string | undefined>(undefined);
  const [defaultTimeframe, setDefaultTimeframe] =
    useState<string | undefined>(undefined);
  const [tradingSaveStatus, setTradingSaveStatus] =
    useState<SaveStatus>("idle");
  const [tradingSaveError, setTradingSaveError] = useState("");

  const [tradingRules, setTradingRules] = useState<string[] | undefined>(
    undefined,
  );
  const [newRuleText, setNewRuleText] = useState("");
  const [rulesSaveStatus, setRulesSaveStatus] = useState<SaveStatus>("idle");
  const [rulesSaveError, setRulesSaveError] = useState("");

  const resolvedFirstName = firstName ?? profile?.first_name ?? "";
  const resolvedLastName = lastName ?? profile?.last_name ?? "";
  const resolvedTimezone = timezone ?? profile?.timezone ?? "utc";
  const resolvedDefaultRisk =
    defaultRisk ?? String(profile?.default_risk_percent ?? 1);
  const resolvedDefaultRR = defaultRR ?? String(profile?.default_rr_ratio ?? 2);
  const resolvedDefaultTimeframe =
    defaultTimeframe ?? profile?.default_timeframe ?? "h4";
  const resolvedRules = useMemo(
    () => tradingRules ?? profile?.trading_rules ?? [],
    [profile?.trading_rules, tradingRules],
  );

  const displayName = useMemo(() => {
    const fullName = [resolvedFirstName.trim(), resolvedLastName.trim()]
      .filter(Boolean)
      .join(" ");
    return fullName || user?.fullName || user?.email || "Account user";
  }, [resolvedFirstName, resolvedLastName, user]);

  const avatarInitials = useMemo(() => {
    const f = resolvedFirstName.trim();
    const l = resolvedLastName.trim();
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "?";
  }, [resolvedFirstName, resolvedLastName, user]);

  const themeValue = (theme ?? "system") as SettingsTheme;

  const saveRules = useCallback(
    async (rules: string[]) => {
      setRulesSaveStatus("saving");
      setRulesSaveError("");

      try {
        await updateCurrentUserProfile({ trading_rules: rules });
        await refreshProfile();
        setRulesSaveStatus("saved");
        scheduleReset("rules", setRulesSaveStatus, 2000);
      } catch (error) {
        setRulesSaveError(
          error instanceof Error ? error.message : "Unknown error",
        );
        setRulesSaveStatus("error");
      }
    },
    [refreshProfile, scheduleReset],
  );

  const addRule = useCallback(() => {
    const text = newRuleText.trim();
    if (!text) return;

    const next = [...resolvedRules, text];
    setTradingRules(next);
    setNewRuleText("");
    void saveRules(next);
  }, [newRuleText, resolvedRules, saveRules]);

  const deleteRule = useCallback(
    (index: number) => {
      const next = resolvedRules.filter((_, itemIndex) => itemIndex !== index);
      setTradingRules(next);
      void saveRules(next);
    },
    [resolvedRules, saveRules],
  );

  const moveRule = useCallback(
    (index: number, direction: -1 | 1) => {
      const next = [...resolvedRules];
      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= next.length) return;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      setTradingRules(next);
      void saveRules(next);
    },
    [resolvedRules, saveRules],
  );

  const handleSaveProfile = useCallback(async () => {
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
      scheduleReset("profile", setProfileSaveStatus, 2500);
    } catch (error) {
      setProfileSaveError(
        error instanceof Error ? error.message : "Unknown error",
      );
      setProfileSaveStatus("error");
    }
  }, [
    refreshProfile,
    resolvedFirstName,
    resolvedLastName,
    resolvedTimezone,
    scheduleReset,
    user,
  ]);

  const handleSaveTrading = useCallback(async () => {
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
      scheduleReset("trading", setTradingSaveStatus, 2500);
    } catch (error) {
      setTradingSaveError(
        error instanceof Error ? error.message : "Unknown error",
      );
      setTradingSaveStatus("error");
    }
  }, [
    refreshProfile,
    resolvedDefaultRisk,
    resolvedDefaultRR,
    resolvedDefaultTimeframe,
    scheduleReset,
    user,
  ]);

  const handleManageSecurity = useCallback(() => {
    openUserProfile();
  }, [openUserProfile]);

  const handleDownloadSettings = useCallback(() => {
    if (!profile) return;

    const payload = {
      exported_at: new Date().toISOString(),
      profile: {
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        timezone: profile.timezone,
        default_risk_percent: profile.default_risk_percent,
        default_rr_ratio: profile.default_rr_ratio,
        default_timeframe: profile.default_timeframe,
        trading_rules: profile.trading_rules,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tradelog-settings.json";
    link.click();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
  }, [profile]);

  if (!isConfigured) {
    return (
      <>
        <AppPageHeader
          eyebrow="Account"
          title="Settings"
          description="Manage profile, trading preferences, and data controls."
        />
        <AppPanelEmptyState
          title="Settings are unavailable"
          description="Authentication is not configured in this environment, so account settings cannot be loaded."
        />
      </>
    );
  }

  if (!isLoaded || loading) {
    return (
      <>
        <AppPageHeader
          eyebrow="Account"
          title="Settings"
          description="Manage profile, trading preferences, and data controls."
        />
        <AppPanelEmptyState
          title="Loading settings"
          description="Fetching your account profile and saved defaults."
          minHeight={180}
        />
      </>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <>
        <AppPageHeader
          eyebrow="Account"
          title="Settings"
          description="Manage profile, trading preferences, and data controls."
        />
        <AppPanelEmptyState
          title="Sign in to manage settings"
          description="Your settings are tied to your account profile, so you need to be signed in to edit them."
          action={
            <Button asChild>
              <Link href="/auth/login">Go to Login</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <AppPageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage profile, trading defaults, theme preferences, and the account tools that are currently available."
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList
          className="h-auto flex-wrap gap-2 rounded-md border p-1"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-default)",
          }}
        >
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
          <SettingsProfilePanels
            avatarUrl={profile?.avatar_url ?? user.imageUrl ?? null}
            avatarInitials={avatarInitials}
            displayName={displayName}
            email={user.email ?? ""}
            resolvedFirstName={resolvedFirstName}
            resolvedLastName={resolvedLastName}
            resolvedTimezone={resolvedTimezone}
            saveStatus={profileSaveStatus}
            saveError={profileSaveError}
            canSave={Boolean(user)}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onTimezoneChange={setTimezone}
            onSave={handleSaveProfile}
            onManageSecurity={handleManageSecurity}
          />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <SettingsAppearancePanels
            theme={themeValue}
            onThemeChange={(value) => setTheme(value)}
          />
        </TabsContent>

        <TabsContent value="trading" className="space-y-6">
          <SettingsTradingPanels
            resolvedDefaultRisk={resolvedDefaultRisk}
            resolvedDefaultRR={resolvedDefaultRR}
            resolvedDefaultTimeframe={resolvedDefaultTimeframe}
            tradingSaveStatus={tradingSaveStatus}
            tradingSaveError={tradingSaveError}
            rulesSaveStatus={rulesSaveStatus}
            rulesSaveError={rulesSaveError}
            resolvedRules={resolvedRules}
            newRuleText={newRuleText}
            canSaveTrading={Boolean(user)}
            onDefaultRiskChange={setDefaultRisk}
            onDefaultRRChange={setDefaultRR}
            onDefaultTimeframeChange={setDefaultTimeframe}
            onSaveTrading={handleSaveTrading}
            onNewRuleTextChange={setNewRuleText}
            onAddRule={addRule}
            onMoveRule={moveRule}
            onDeleteRule={deleteRule}
          />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <SettingsDataPanels
            canDownloadSettings={Boolean(profile)}
            onDownloadSettings={handleDownloadSettings}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
