"use client";

import {
  ArrowUpRight,
  BookOpen,
  Copy,
  MoreHorizontal,
  PencilLine,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppPanel, AppStatList } from "@/components/ui/page-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";
import type { PlaybookCardData } from "@/lib/playbooks/view-model";

interface PlaybookCardProps {
  playbook: PlaybookCardData;
  onManage: (playbookId: string) => void;
  onDuplicate: (playbookId: string) => void;
  onToggleActive: (playbookId: string) => void;
  onDelete: (playbookId: string) => void;
}

function formatCurrency(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString()}`;
}

function StatusChip({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.18em]"
      style={{
        background: active ? "var(--profit-bg)" : "var(--surface-elevated)",
        color: active ? "var(--profit-primary)" : "var(--text-tertiary)",
      }}
    >
      {active ? "Active" : "Paused"}
    </span>
  );
}

export function PlaybookCard({
  playbook,
  onManage,
  onDuplicate,
  onToggleActive,
  onDelete,
}: PlaybookCardProps) {
  const ruleCount = playbook.rules.length;
  const pnlTone = playbook.stats.totalPnl >= 0 ? "profit" : "loss";
  const winRateTone = playbook.stats.winRate >= 50 ? "profit" : "loss";

  return (
    <AppPanel className="flex h-full flex-col p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent-primary)",
            }}
          >
            <BookOpen className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className="truncate text-[0.95rem] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {playbook.name}
              </h3>
              <StatusChip active={playbook.isActive} />
            </div>
            <p
              className="mt-1 line-clamp-2 text-[0.76rem] leading-relaxed"
              style={{ color: "var(--text-tertiary)" }}
            >
              {playbook.description || "No description provided yet."}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Open actions for ${playbook.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onManage(playbook.id)}>
              <PencilLine className="mr-2 h-4 w-4" />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(playbook.id)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(playbook.id)}>
              {playbook.isActive ? "Pause playbook" : "Activate playbook"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(playbook.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <InsetPanel className="mb-3" paddingClassName="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-label">Win Rate</p>
            <p
              className="mono mt-1 text-sm font-semibold"
              style={{
                color:
                  winRateTone === "profit"
                    ? "var(--profit-primary)"
                    : "var(--loss-primary)",
              }}
            >
              {playbook.stats.winRate.toFixed(1)}%
            </p>
          </div>

          <p
            className="text-[0.72rem]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {playbook.stats.totalTrades} closed trades
          </p>
        </div>

        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full"
          style={{ background: "var(--border-subtle)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(playbook.stats.winRate, 100)}%`,
              background:
                winRateTone === "profit"
                  ? "var(--profit-primary)"
                  : "var(--loss-primary)",
            }}
          />
        </div>
      </InsetPanel>

      <InsetPanel className="mb-4" paddingClassName="px-4 py-2">
        <AppStatList
          items={[
            {
              label: "Trades",
              value: String(playbook.stats.totalTrades),
            },
            {
              label: "Avg R",
              value: `${playbook.stats.avgRMultiple.toFixed(1)}R`,
            },
            {
              label: "Net P&L",
              value: formatCurrency(playbook.stats.totalPnl),
              tone: pnlTone,
            },
          ]}
        />
      </InsetPanel>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <span
          className="rounded-full px-2.5 py-1 text-[0.72rem]"
          style={{
            background: "var(--surface-elevated)",
            color:
              ruleCount > 0 ? "var(--text-secondary)" : "var(--text-tertiary)",
          }}
        >
          {ruleCount > 0 ? `${ruleCount} rules` : "No rules added"}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onManage(playbook.id)}
        >
          Edit Playbook
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>
    </AppPanel>
  );
}
