"use client";

import { useMemo } from "react";
import { ArrowUp, ArrowDown, Minus, type LucideIcon } from "lucide-react";
import type { EnrichedTrade } from "@/domain/trade-types";
import type { TfObservations } from "@/lib/supabase/types";

type BiasValue = "Bullish" | "Bearish" | "Neutral" | undefined;

interface BiasWidgetProps {
  trade: EnrichedTrade;
  onUpdate: (field: keyof EnrichedTrade, value: unknown) => void;
}

const TIMEFRAMES = [
  { id: "M", label: "Monthly" },
  { id: "W", label: "Weekly" },
  { id: "D", label: "Daily" },
  { id: "4H", label: "4h" },
  { id: "1H", label: "1h" },
];

function BiasBtn({
  active,
  onClick,
  icon: Icon,
  activeColor,
  activeBg,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  activeColor: string;
  activeBg: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded-[6px] transition-all duration-150"
      style={{
        color: active ? activeColor : "var(--text-tertiary)",
        background: active ? activeBg : "var(--surface-elevated)",
        border: `1px solid ${active ? activeColor : "var(--border-subtle)"}`,
        boxShadow: active ? `0 0 8px ${activeColor}33` : "none",
      }}
    >
      <Icon size={13} strokeWidth={active ? 2.5 : 1.8} />
    </button>
  );
}

export function BiasWidget({ trade, onUpdate }: BiasWidgetProps) {
  const observations = useMemo(() => {
    return (trade.tf_observations as unknown as TfObservations) || {};
  }, [trade.tf_observations]);

  const handleBias = (tf: string, value: BiasValue) => {
    const current = observations[tf] || { notes: "", pd_arrays: [] };
    const finalValue = current.bias === value ? undefined : value;
    onUpdate("tf_observations", {
      ...observations,
      [tf]: { ...current, bias: finalValue },
    });
  };

  const handleNotes = (tf: string, notes: string) => {
    const current = observations[tf] || {
      notes: "",
      pd_arrays: [],
      bias: undefined,
    };
    onUpdate("tf_observations", {
      ...observations,
      [tf]: { ...current, notes },
    });
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {TIMEFRAMES.map((tf) => {
          const obs = observations[tf.id];
          const currentBias = obs?.bias as BiasValue;
          const notes = obs?.notes || "";

          return (
            <div
              key={tf.id}
              className="flex flex-col gap-2 rounded-[10px] p-3"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {/* TF header + bias buttons */}
              <div className="flex items-center justify-between">
                <span
                  className="font-bold uppercase tracking-widest"
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {tf.label}
                </span>
                <div className="flex items-center gap-1">
                  <BiasBtn
                    active={currentBias === "Bullish"}
                    onClick={() => handleBias(tf.id, "Bullish")}
                    icon={ArrowUp}
                    activeColor="var(--profit-primary)"
                    activeBg="var(--profit-bg)"
                    title="Bullish"
                  />
                  <BiasBtn
                    active={currentBias === "Neutral"}
                    onClick={() => handleBias(tf.id, "Neutral")}
                    icon={Minus}
                    activeColor="var(--text-secondary)"
                    activeBg="var(--surface-active)"
                    title="Neutral"
                  />
                  <BiasBtn
                    active={currentBias === "Bearish"}
                    onClick={() => handleBias(tf.id, "Bearish")}
                    icon={ArrowDown}
                    activeColor="var(--loss-primary)"
                    activeBg="var(--loss-bg)"
                    title="Bearish"
                  />
                </div>
              </div>

              {/* Bias indicator pill */}
              {currentBias && (
                <span
                  className="self-start text-[0.58rem] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                  style={{
                    background:
                      currentBias === "Bullish"
                        ? "var(--profit-bg)"
                        : currentBias === "Bearish"
                          ? "var(--loss-bg)"
                          : "var(--surface-active)",
                    color:
                      currentBias === "Bullish"
                        ? "var(--profit-primary)"
                        : currentBias === "Bearish"
                          ? "var(--loss-primary)"
                          : "var(--text-secondary)",
                  }}
                >
                  {currentBias}
                </span>
              )}

              {/* Notes */}
              <textarea
                placeholder="Analysis…"
                value={notes}
                onChange={(e) => handleNotes(tf.id, e.target.value)}
                className="w-full resize-none focus:outline-none leading-relaxed"
                style={{
                  minHeight: "72px",
                  fontSize: "0.72rem",
                  color: "var(--text-primary)",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
