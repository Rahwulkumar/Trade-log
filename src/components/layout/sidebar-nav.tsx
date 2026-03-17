"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { X, ChevronsLeft, ChevronsRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePropAccount } from "@/components/prop-account-provider";
import { useAuth } from "@/components/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  IconDashboard,
  IconAnalytics,
  IconPlaybooks,
  IconStrategies,
  IconJournal,
  IconNotebook,
  IconReports,
  IconPropFirm,
  IconSettings,
  IconChevronRight,
  IconNews,
} from "@/components/ui/icons";

// ─── Nav structure ────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
      { href: "/analytics", label: "Analytics", Icon: IconAnalytics },
    ],
  },
  {
    label: "Trading",
    items: [
      { href: "/journal", label: "Journal", Icon: IconJournal },
      { href: "/notebook", label: "Notebook", Icon: IconNotebook },
      { href: "/playbooks", label: "Playbooks", Icon: IconPlaybooks },
      { href: "/strategies", label: "Strategies", Icon: IconStrategies },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/reports", label: "Reports", Icon: IconReports },
      { href: "/news", label: "News", Icon: IconNews },
      { href: "/prop-firm", label: "Prop Firm", Icon: IconPropFirm },
    ],
  },
];

// Theme constants (Bangladesh Green dark palette)
const T = {
  bg: "#051F20",
  elevated: "#0B2B26",
  hover: "#163832",
  active: "#1A3D34",
  accent: "#2CC299",
  accentDim: "rgba(44,194,153,0.15)",
  accentBorder: "rgba(44,194,153,0.4)",
  textPrimary: "#DAF1DE",
  textSec: "#8EB69B",
  textTert: "#52796F",
  border: "rgba(218,241,222,0.09)",
  borderHover: "rgba(218,241,222,0.16)",
};

// ─── Logo Mark ────────────────────────────────────────────────────────────────
function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-[9px]"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #0D5C3A 0%, #1A8C6A 100%)",
        boxShadow:
          "0 0 12px rgba(44,194,153,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 20 20"
        fill="none"
      >
        {/* Ascending bars */}
        <rect
          x="2.5"
          y="13"
          width="2.5"
          height="4"
          rx="0.7"
          fill="rgba(218,241,222,0.5)"
        />
        <rect
          x="6.5"
          y="10"
          width="2.5"
          height="7"
          rx="0.7"
          fill="rgba(218,241,222,0.7)"
        />
        <rect x="10.5" y="6" width="2.5" height="11" rx="0.7" fill="#DAF1DE" />
        <rect
          x="14.5"
          y="9"
          width="2.5"
          height="8"
          rx="0.7"
          fill="rgba(218,241,222,0.55)"
        />
        {/* Up-tick */}
        <polyline
          points="11.75,5.5 11.75,2.5 14.5,5"
          stroke="#2CC299"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

// ─── Live clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="font-mono tabular-nums tracking-widest"
      style={{ fontSize: "0.6rem", color: T.textTert }}
    >
      {time || "00:00:00"}
    </span>
  );
}

// ─── Account Picker ───────────────────────────────────────────────────────────
function AccountPicker({ collapsed }: { collapsed: boolean }) {
  const { propAccounts, selectedAccountId, setSelectedAccountId } =
    usePropAccount();
  const [open, setOpen] = useState(false);
  const selected = propAccounts.find((a) => a.id === selectedAccountId);

  const Dropdown = (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <motion.div
        initial={{ opacity: 0, y: 4, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.97 }}
        transition={{ duration: 0.13 }}
        className="absolute z-50 min-w-[200px] overflow-hidden rounded-[8px]"
        style={{
          background: "#0B2B26",
          border: `1px solid ${T.border}`,
          boxShadow:
            "0 20px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(44,194,153,0.08)",
        }}
      >
        {/* All Accounts option */}
        <Button
          type="button"
          onClick={() => {
            setSelectedAccountId(null);
            setOpen(false);
          }}
          variant="ghost"
          className="h-auto w-full justify-start gap-2.5 rounded-none px-3 py-2.5 text-left hover:bg-[#163832] hover:text-inherit"
          style={{
            background: selectedAccountId === null ? T.active : "transparent",
          }}
        >
          <div
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{
              background: selectedAccountId === null ? T.accent : T.textTert,
            }}
          />
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              color: selectedAccountId === null ? T.accent : T.textPrimary,
            }}
          >
            All Accounts
          </span>
        </Button>
        {/* Individual accounts */}
        {propAccounts.map((acct) => {
          const isSel = selectedAccountId === acct.id;
          return (
            <Button
              key={acct.id}
              type="button"
              onClick={() => {
                setSelectedAccountId(acct.id);
                setOpen(false);
              }}
              variant="ghost"
              className="h-auto w-full justify-start gap-2.5 rounded-none px-3 py-2.5 text-left hover:bg-[#163832] hover:text-inherit"
              style={{ background: isSel ? T.active : "transparent" }}
            >
              <div
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ background: isSel ? T.accent : T.textTert }}
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: isSel ? T.accent : T.textPrimary,
                }}
              >
                {acct.accountName}
              </span>
            </Button>
          );
        })}
        {/* Add account CTA when empty or always for quick access */}
        <div className="border-t border-border/60 mt-1 pt-1">
          <Link
            href="/prop-firm"
            onClick={() => setOpen(false)}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-auto w-full justify-start gap-2.5 rounded-none px-3 py-2.5 text-left hover:bg-[#163832]",
            )}
            style={{ color: T.accent }}
          >
            <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>+ Add account</span>
          </Link>
        </div>
      </motion.div>
    </>
  );

  if (collapsed) {
    return (
      <div className="relative flex justify-center">
        <Button
          type="button"
          title={selected?.accountName ?? "All Accounts"}
          onClick={() => setOpen((o) => !o)}
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8 rounded-[7px] p-0 text-[#8EB69B] hover:bg-[#163832] hover:text-[#DAF1DE]"
        >
          <IconPropFirm size={14} strokeWidth={1.7} />
        </Button>
        <AnimatePresence>
          {open && (
            <div className="absolute left-full bottom-0 ml-2">{Dropdown}</div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        type="button"
        onClick={() => setOpen((o) => !o)}
        variant="ghost"
        className="h-auto w-full justify-start gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[#DAF1DE] hover:bg-[#0B2B26] hover:text-[#DAF1DE]"
        style={{ background: open ? T.elevated : "transparent" }}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px]"
          style={{ background: T.accentDim, color: T.accent }}
        >
          <IconPropFirm size={12} strokeWidth={1.7} />
        </span>
        <div className="flex-1 min-w-0 text-left">
          <p
            className="truncate font-medium leading-none"
            style={{ fontSize: "0.73rem", color: T.textPrimary }}
          >
            {selected?.accountName ?? "All Accounts"}
          </p>
          <p
            className="mt-0.5 leading-none truncate"
            style={{ fontSize: "0.58rem", color: T.textSec }}
          >
            {selected?.status ?? "No filter active"}
          </p>
        </div>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          style={{ display: "flex", color: T.textTert }}
        >
          <IconChevronRight size={10} strokeWidth={2.5} />
        </motion.span>
      </Button>

      <AnimatePresence>
        {open && (
          <div className="absolute left-0 right-0 bottom-full mb-1.5">
            {Dropdown}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────
interface SidebarContentProps {
  onNavClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function SidebarContent({
  onNavClick,
  collapsed = false,
  onToggleCollapse,
}: SidebarContentProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "VX";
  const username = user?.email ? user.email.split("@")[0] : "Trader";

  return (
    <div className="flex h-full flex-col" style={{ background: T.bg }}>
      {/* ── Logo bar ── */}
      <div
        className={cn(
          "flex shrink-0 items-center transition-all duration-300",
          collapsed ? "justify-center px-0 py-4" : "gap-3 px-4",
        )}
        style={{ height: "60px", borderBottom: `1px solid ${T.border}` }}
      >
        <LogoMark size={33} />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="wordmark"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col leading-none overflow-hidden"
            >
              <span
                style={{
                  fontFamily: "var(--font-syne, sans-serif)",
                  fontWeight: 800,
                  fontSize: "1.05rem",
                  letterSpacing: "-0.05em",
                  color: T.textPrimary,
                  lineHeight: 1,
                }}
              >
                TradeLog
              </span>
              <span
                style={{
                  fontSize: "0.48rem",
                  color: T.textTert,
                  textTransform: "uppercase",
                  letterSpacing: "0.25em",
                  fontWeight: 700,
                  marginTop: "3px",
                }}
              >
                Trading Journal
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Market status strip ── */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="market-strip"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "26px" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex shrink-0 items-center justify-between overflow-hidden px-4"
            style={{ borderBottom: `1px solid ${T.border}` }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: T.accent }}
              />
              <span
                style={{
                  fontSize: "0.52rem",
                  color: T.textSec,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  fontWeight: 700,
                }}
              >
                Markets Open
              </span>
            </div>
            <LiveClock />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation ── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-3"
        style={{ scrollbarWidth: "none" }}
      >
        <AnimatePresence initial={false}>
          {!collapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-3 space-y-5"
            >
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="px-2 mb-1">
                    <span
                      style={{
                        fontSize: "0.49rem",
                        fontWeight: 700,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: T.textTert,
                      }}
                    >
                      {group.label}
                    </span>
                  </div>
                  <div className="space-y-px">
                    {group.items.map(({ href, label, Icon }) => {
                      const active = isActive(href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={onNavClick}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "group relative h-auto w-full justify-start gap-2.5 rounded-[6px] px-[10px] py-[7px] text-[#8EB69B] transition-all duration-150 hover:bg-[#163832] hover:text-[#DAF1DE]",
                          )}
                          style={{
                            color: active ? T.accent : T.textSec,
                            background: active ? T.accentDim : "transparent",
                            boxShadow: active
                              ? `inset 3px 0 0 ${T.accent}`
                              : `inset 3px 0 0 transparent`,
                          }}
                        >
                          <Icon
                            size={15}
                            strokeWidth={active ? 2.1 : 1.6}
                            className="shrink-0 transition-colors"
                          />
                          <span
                            className="flex-1 text-[0.8rem] transition-colors"
                            style={{
                              fontWeight: active ? 600 : 500,
                              color: active ? T.textPrimary : T.textSec,
                            }}
                          >
                            {label}
                          </span>
                          {active && (
                            <span
                              className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{
                                background: T.accent,
                                boxShadow: `0 0 6px ${T.accent}`,
                              }}
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center gap-1 px-2"
            >
              {NAV_GROUPS.flatMap((g) => g.items).map(
                ({ href, label, Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onNavClick}
                      title={label}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "group relative h-9 w-full rounded-[6px] p-0 text-[#8EB69B] transition-all duration-150 hover:bg-[#163832] hover:text-[#DAF1DE]",
                      )}
                      style={{
                        color: active ? T.accent : T.textSec,
                        background: active ? T.accentDim : "transparent",
                        boxShadow: active
                          ? `inset 3px 0 0 ${T.accent}`
                          : `inset 3px 0 0 transparent`,
                      }}
                    >
                      <Icon
                        size={16}
                        strokeWidth={active ? 2.1 : 1.6}
                        className="transition-colors"
                      />
                    </Link>
                  );
                },
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Bottom zone ── */}
      <div
        className="shrink-0"
        style={{
          borderTop: `1px solid ${T.border}`,
          padding: collapsed ? "8px 8px" : "8px 12px",
          background: T.bg,
        }}
      >
        <AccountPicker collapsed={collapsed} />

        <div style={{ height: "1px", background: T.border, margin: "8px 0" }} />

        {/* User row */}
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold select-none"
              style={{
                background: T.active,
                color: T.accent,
                border: `1px solid ${T.accentBorder}`,
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold truncate leading-none"
                style={{ fontSize: "0.73rem", color: T.textPrimary }}
              >
                {username}
              </p>
              <p
                className="leading-none mt-0.5 truncate"
                style={{ fontSize: "0.58rem", color: T.textSec }}
              >
                {user?.email ?? "No account"}
              </p>
            </div>
            <Link
              href="/settings"
              onClick={onNavClick}
              title="Settings"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "h-7 w-7 shrink-0 rounded-[6px] p-0 text-[#52796F] hover:bg-[#163832] hover:text-[#8EB69B]",
              )}
              style={{ color: T.textTert }}
            >
              <IconSettings size={13} strokeWidth={1.6} />
            </Link>
          </div>
        ) : (
          <div className="flex justify-center">
            <Link
              href="/settings"
              onClick={onNavClick}
              title="Settings"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "h-8 w-8 rounded-[7px] p-0 text-[#52796F] hover:bg-[#163832] hover:text-[#8EB69B]",
              )}
              style={{ color: T.textTert }}
            >
              <IconSettings size={15} strokeWidth={1.6} />
            </Link>
          </div>
        )}

        {/* Collapse toggle */}
        {onToggleCollapse && (
          <Button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            variant="ghost"
            className="mt-2 h-auto w-full gap-2 rounded-[7px] py-1.5 text-[#52796F] hover:bg-[#163832] hover:text-[#8EB69B]"
          >
            {collapsed ? (
              <ChevronsRight size={14} strokeWidth={1.8} />
            ) : (
              <>
                <ChevronsLeft size={14} strokeWidth={1.8} />
                <span className="text-[0.68rem] font-medium">Collapse</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main SidebarNav export ───────────────────────────────────────────────────
interface SidebarNavProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SidebarNav({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onToggleCollapse,
}: SidebarNavProps) {
  const pathname = usePathname();
  useEffect(() => {
    if (mobileOpen && onMobileClose) onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="sidebar-theme hidden md:flex flex-col fixed left-0 top-0 h-screen overflow-hidden"
        style={{
          width: sidebarWidth,
          background: T.bg,
          transition: "width 280ms cubic-bezier(0.4,0,0.2,1)",
          zIndex: 40,
          borderRight: `1px solid ${T.border}`,
        }}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="sidebar-theme fixed left-0 top-0 h-screen flex flex-col z-50 md:hidden"
            style={{
              width: "260px",
              background: T.bg,
              boxShadow: "8px 0 48px rgba(0,0,0,0.5)",
            }}
          >
            <Button
              type="button"
              onClick={onMobileClose}
              variant="ghost"
              size="icon-sm"
              className="absolute right-4 top-4 z-10 h-7 w-7 rounded-full p-0 text-[#52796F] hover:bg-[#163832] hover:text-[#8EB69B]"
              aria-label="Close sidebar"
            >
              <X size={15} strokeWidth={2} />
            </Button>
            <SidebarContent onNavClick={onMobileClose} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
