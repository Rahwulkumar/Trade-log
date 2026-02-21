"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePropAccount } from "@/components/prop-account-provider";
import { useAuth } from "@/components/auth-provider";
import {
  IconDashboard,
  IconAnalytics,
  IconPlaybooks,
  IconStrategies,
  IconJournal,
  IconReports,
  IconPropFirm,
  IconSettings,
  IconChevronRight,
} from "@/components/ui/icons";

// ─── Nav items ──────────────────────────────────────────────────────────────
const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/analytics", label: "Analytics", Icon: IconAnalytics },
  { href: "/playbooks", label: "Playbooks", Icon: IconPlaybooks },
  { href: "/strategies", label: "Strategies", Icon: IconStrategies },
  { href: "/journal", label: "Journal", Icon: IconJournal },
  { href: "/reports", label: "Reports", Icon: IconReports },
  { href: "/prop-firm", label: "Prop Firm", Icon: IconPropFirm },
];

// ─── Account picker ─────────────────────────────────────────────────────────
function AccountPicker({ collapsed }: { collapsed: boolean }) {
  const { propAccounts, selectedAccountId, setSelectedAccountId } =
    usePropAccount();
  const [open, setOpen] = useState(false);
  const selected = propAccounts.find((a) => a.id === selectedAccountId);

  if (collapsed) {
    return (
      <div className="relative">
        <button
          title={selected?.name ?? "All Accounts"}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-center rounded-[var(--radius-default)] p-2 transition-colors hover:bg-[var(--surface-hover)]"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px]"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent-primary)",
            }}
          >
            <IconPropFirm size={13} strokeWidth={1.7} />
          </span>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-full bottom-0 ml-2 rounded-[var(--radius-md)] overflow-hidden z-50 min-w-[180px]"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "4px 4px 24px rgba(0,0,0,0.5)",
              }}
            >
              <button
                onClick={() => {
                  setSelectedAccountId(null);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-3 py-2.5 text-[0.78rem] text-left transition-colors",
                  !selectedAccountId
                    ? "text-[var(--accent-primary)] bg-[var(--accent-soft)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
                )}
              >
                All Accounts
              </button>
              {propAccounts.map((acct) => (
                <button
                  key={acct.id}
                  onClick={() => {
                    setSelectedAccountId(acct.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full flex-col items-start px-3 py-2.5 text-left transition-colors",
                    selectedAccountId === acct.id
                      ? "bg-[var(--accent-soft)]"
                      : "hover:bg-[var(--surface-hover)]",
                  )}
                >
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 500,
                      color:
                        selectedAccountId === acct.id
                          ? "var(--accent-primary)"
                          : "var(--text-primary)",
                    }}
                  >
                    {acct.name}
                  </span>
                  <span
                    style={{
                      fontSize: "0.63rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {acct.status ?? "active"}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-default)] px-3 py-1.5 transition-colors hover:bg-[var(--surface-hover)]"
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px]"
          style={{
            background: "var(--accent-soft)",
            color: "var(--accent-primary)",
          }}
        >
          <IconPropFirm size={13} strokeWidth={1.7} />
        </span>
        <div className="flex-1 min-w-0 text-left">
          <p
            className="truncate font-medium leading-none"
            style={{ fontSize: "0.78rem", color: "var(--text-primary)" }}
          >
            {selected?.name ?? "All Accounts"}
          </p>
          <p
            className="mt-0.5 leading-none"
            style={{ fontSize: "0.63rem", color: "var(--text-tertiary)" }}
          >
            {selected?.status ?? "No filter"}
          </p>
        </div>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          style={{ display: "flex" }}
        >
          <IconChevronRight
            size={11}
            strokeWidth={2.5}
            className="shrink-0 text-[var(--text-tertiary)]"
          />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 right-0 bottom-full mb-1.5 rounded-[var(--radius-md)] overflow-hidden z-50"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-default)",
              boxShadow: "0 -16px 40px rgba(0,0,0,0.65)",
            }}
          >
            <button
              onClick={() => {
                setSelectedAccountId(null);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center px-3 py-2.5 text-[0.78rem] text-left transition-colors",
                !selectedAccountId
                  ? "text-[var(--accent-primary)] bg-[var(--accent-soft)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
              )}
            >
              All Accounts
            </button>
            {propAccounts.map((acct) => (
              <button
                key={acct.id}
                onClick={() => {
                  setSelectedAccountId(acct.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col items-start px-3 py-2.5 text-left transition-colors",
                  selectedAccountId === acct.id
                    ? "bg-[var(--accent-soft)]"
                    : "hover:bg-[var(--surface-hover)]",
                )}
              >
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 500,
                    color:
                      selectedAccountId === acct.id
                        ? "var(--accent-primary)"
                        : "var(--text-primary)",
                  }}
                >
                  {acct.name}
                </span>
                <span
                  style={{ fontSize: "0.63rem", color: "var(--text-tertiary)" }}
                >
                  {acct.status ?? "active"}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sidebar inner content ─────────────────────────────────────────────────
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
    : "TL";
  const username = user?.email ? user.email.split("@")[0] : "Trader";

  return (
    <div className="flex h-full flex-col">
      {/* ─── Logo bar ─── */}
      <div
        className={cn(
          "flex items-center shrink-0 transition-all duration-300",
          collapsed ? "justify-center px-2" : "gap-3 px-4",
        )}
        style={{
          height: "60px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-[8px] shrink-0 select-none"
          style={{
            background: "#03624C",
            color: "#DAF1DE",
            fontFamily: "var(--font-plus-jakarta)",
            fontWeight: 900,
            fontSize: "0.85rem",
            letterSpacing: "-0.02em",
          }}
        >
          CT
        </div>
        {!collapsed && (
          <div>
            <span
              style={{
                fontFamily: "var(--font-plus-jakarta)",
                fontWeight: 800,
                fontSize: "0.92rem",
                letterSpacing: "-0.04em",
                color: "var(--text-primary)",
                lineHeight: 1,
                display: "block",
              }}
            >
              Coniyest
            </span>
            <span
              style={{
                fontSize: "0.55rem",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 600,
              }}
            >
              Journal
            </span>
          </div>
        )}
      </div>

      {/* ─── Nav list ─── */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5 transition-all duration-300",
          collapsed ? "px-1.5" : "px-2.5",
        )}
      >
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              title={collapsed ? label : undefined}
              className={cn(
                "nav-item relative w-full",
                collapsed && "justify-center px-0",
              )}
            >
              {/* Animated active background */}
              {active && (
                <motion.span
                  layoutId="nav-active-bg"
                  className="absolute inset-0 rounded-[var(--radius-default)]"
                  style={{ background: "#03624C" }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <span
                className="shrink-0 transition-colors relative z-10 flex items-center"
                style={{ color: active ? "#DAF1DE" : "var(--text-tertiary)" }}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.6} />
              </span>
              {!collapsed && (
                <span
                  className="flex-1 relative z-10"
                  style={{ color: active ? "#DAF1DE" : undefined }}
                >
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ─── Bottom zone ─── */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: collapsed ? "0.4rem 0.4rem" : "0.4rem 0.6rem 0.4rem",
        }}
      >
        <AccountPicker collapsed={collapsed} />
        {!collapsed && (
          <div
            style={{
              height: "1px",
              background: "var(--border-subtle)",
              margin: "0.5rem 0",
            }}
          />
        )}
        <div
          className={cn(
            "flex items-center gap-2.5 px-1 py-1",
            collapsed && "justify-center flex-col gap-1",
          )}
        >
          {!collapsed && (
            <>
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-[0.7rem] select-none"
                style={{
                  background: "#03624C",
                  color: "#DAF1DE",
                }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="font-semibold truncate leading-none"
                  style={{ fontSize: "0.78rem", color: "var(--text-primary)" }}
                >
                  {username}
                </p>
                <p
                  className="leading-none mt-0.5 truncate"
                  style={{ fontSize: "0.62rem", color: "var(--text-tertiary)" }}
                >
                  {user?.email ?? "No account"}
                </p>
              </div>
              <Link
                href="/settings"
                onClick={onNavClick}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--surface-active)]"
                style={{ color: "var(--text-tertiary)" }}
                title="Settings"
              >
                <IconSettings size={13} strokeWidth={1.6} />
              </Link>
            </>
          )}
          {collapsed && (
            <>
              <Link
                href="/settings"
                onClick={onNavClick}
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--surface-active)]"
                style={{ color: "var(--text-tertiary)" }}
                title="Settings"
              >
                <IconSettings size={15} strokeWidth={1.6} />
              </Link>
            </>
          )}
        </div>

        {/* ─── Collapse toggle ─── */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "mt-1 flex w-full items-center gap-2 rounded-[var(--radius-default)] px-2.5 py-2 text-[0.72rem] font-medium transition-colors hover:bg-[var(--surface-hover)]",
              collapsed && "justify-center",
            )}
            style={{ color: "var(--text-tertiary)" }}
          >
            {collapsed ? (
              <PanelLeftOpen size={15} strokeWidth={1.5} />
            ) : (
              <>
                <PanelLeftClose size={15} strokeWidth={1.5} />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main SidebarNav export ──────────────────────────────────────────────────
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
  // Close sidebar on route change (mobile)
  const pathname = usePathname();
  useEffect(() => {
    if (mobileOpen && onMobileClose) onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const sidebarWidth = collapsed ? 60 : 240;

  return (
    <>
      {/* ─── Desktop sidebar (always visible ≥ md) ─── */}
      <aside
        className="sidebar-theme hidden md:flex flex-col fixed left-0 top-0 h-screen overflow-hidden transition-[width] duration-300 ease-in-out"
        style={{
          width: sidebarWidth,
          zIndex: 40,
          borderRight: "1px solid rgba(255,255,255,0.07)",
          boxShadow:
            "4px 0 24px rgba(0,0,0,0.18), 1px 0 0 rgba(255,255,255,0.04)",
        }}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>

      {/* ─── Mobile: Backdrop ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ─── Mobile: Slide-in drawer ─── */}
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
              boxShadow: "4px 0 32px rgba(0,0,0,0.4)",
            }}
          >
            {/* Close button */}
            <button
              onClick={onMobileClose}
              className="absolute top-4 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-[var(--surface-active)]"
              style={{ color: "var(--text-tertiary)" }}
              aria-label="Close sidebar"
            >
              <X size={15} strokeWidth={2} />
            </button>
            <SidebarContent onNavClick={onMobileClose} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
