"use client";

import { useState } from "react";
import { Download, Trash2, Moon, Sun, Monitor } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weeklyReport: true,
    drawdownAlert: true,
  });

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <section>
        <p className="text-label mb-1">Account</p>
        <h1 className="headline-lg">Settings</h1>
      </section>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-void-surface border border-white/10">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-black/60 backdrop-blur-xl border-white/5">
            <CardContent className="p-6">
              <h3 className="headline-md mb-2">Profile Information</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Update your personal information
              </p>

              <div className="flex items-center gap-6 mb-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="/avatar.png" alt="User" />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    TR
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-white/10 hover:bg-white/5"
                  >
                    Change Photo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    defaultValue="Trader"
                    className="bg-void border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    defaultValue="Pro"
                    className="bg-void border-white/10"
                  />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue="trader@example.com"
                  className="bg-void border-white/10"
                />
              </div>

              <div className="space-y-2 mb-6">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="utc">
                  <SelectTrigger className="bg-void border-white/10">
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

              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-black/60 backdrop-blur-xl border-white/5">
            <CardContent className="p-6">
              <h3 className="headline-md mb-2">Password</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Update your password
              </p>

              <div className="space-y-2 mb-4">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  className="bg-void border-white/10"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    className="bg-void border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    className="bg-void border-white/10"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                className="bg-transparent border-white/10 hover:bg-white/5"
              >
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="bg-black/60 backdrop-blur-xl border-white/5">
            <CardContent className="p-6">
              <h3 className="headline-md mb-2">Theme</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Choose your preferred color scheme
              </p>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: "light", icon: Sun, label: "Light" },
                  { value: "dark", icon: Moon, label: "Dark" },
                  { value: "system", icon: Monitor, label: "System" },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() =>
                      setTheme(value as "light" | "dark" | "system")
                    }
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all",
                      theme === value
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/10 hover:border-white/20",
                    )}
                  >
                    <Icon className="h-6 w-6 mx-auto mb-2" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 backdrop-blur-xl border-white/5">
            <CardContent className="p-6">
              <h3 className="headline-md mb-2">Dashboard View</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Default view mode for your dashboard
              </p>

              <Select defaultValue="dollars">
                <SelectTrigger className="w-[200px] bg-void border-white/10">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dollars">Dollars ($)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="rmultiple">R-Multiple</SelectItem>
                  <SelectItem value="pips">Pips/Ticks</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-black/60 backdrop-blur-xl border-white/5">
            <CardContent className="p-6">
              <h3 className="headline-md mb-2">Notification Preferences</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Manage how you receive notifications
              </p>

              <div className="space-y-6">
                {[
                  {
                    key: "email",
                    label: "Email Notifications",
                    desc: "Receive updates via email",
                  },
                  {
                    key: "push",
                    label: "Push Notifications",
                    desc: "Browser push notifications",
                  },
                  {
                    key: "weeklyReport",
                    label: "Weekly Report",
                    desc: "Receive weekly performance summary",
                  },
                  {
                    key: "drawdownAlert",
                    label: "Drawdown Alerts",
                    desc: "Alert when approaching drawdown limits",
                  },
                ].map(({ key, label, desc }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                  >
                    <div>
                      <Label>{label}</Label>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={notifications[key as keyof typeof notifications]}
                      onCheckedChange={(v) =>
                        setNotifications({ ...notifications, [key]: v })
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trading Tab */}
        <TabsContent value="trading" className="space-y-6">
          <Card className="bg-black/60 backdrop-blur-xl border-white/5">
            <CardContent className="p-6">
              <h3 className="headline-md mb-2">Default Trading Settings</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configure your default trade settings
              </p>

              <div className="grid gap-4 md:grid-cols-2 mb-4">
                <div className="space-y-2">
                  <Label>Default Risk %</Label>
                  <Input
                    type="number"
                    defaultValue="1"
                    step="0.1"
                    className="bg-void border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default R:R Ratio</Label>
                  <Input
                    type="number"
                    defaultValue="2"
                    step="0.5"
                    className="bg-void border-white/10"
                  />
                </div>
              </div>
              <div className="space-y-2 mb-6">
                <Label>Default Timeframe</Label>
                <Select defaultValue="h4">
                  <SelectTrigger className="w-[200px] bg-void border-white/10">
                    <SelectValue placeholder="Select timeframe" />
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
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card className="bg-black/60 backdrop-blur-xl border-white/5">
            <CardContent className="p-6">
              <h3 className="headline-md mb-2">Export Data</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Download your trading data
              </p>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="bg-transparent border-white/10 hover:bg-white/5"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Trades (CSV)
                </Button>
                <Button
                  variant="outline"
                  className="bg-transparent border-white/10 hover:bg-white/5"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Analytics (PDF)
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 backdrop-blur-xl border-white/5 border-red-500/20">
            <CardContent className="p-6">
              <h3 className="headline-md text-red-500 mb-2">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Irreversible actions
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div>
                    <p className="font-medium">Delete All Trades</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete all your trade data
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="bg-transparent border-red-500/20 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="bg-transparent border-red-500/20 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
