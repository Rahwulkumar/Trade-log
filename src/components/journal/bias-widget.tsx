"use client";

import { useMemo } from "react";
import { EnrichedTrade } from "@/domain/trade-types";
import { TfObservations } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus, type LucideIcon } from "lucide-react";

type BiasValue = "Bullish" | "Bearish" | "Neutral" | undefined;
type ObsField = "bias" | "notes";
type ObsValue = string | BiasValue;

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

export function BiasWidget({ trade, onUpdate }: BiasWidgetProps) {
  const observations = useMemo(() => {
    return (trade.tf_observations as unknown as TfObservations) || {};
  }, [trade.tf_observations]);

  const handleUpdate = (tf: string, field: ObsField, value: ObsValue) => {
    const current = observations[tf] || { notes: "", pd_arrays: [] };

    // Toggle bias logic — click same = deselect
    let finalValue = value;
    if (field === "bias" && current.bias === value) {
      finalValue = undefined;
    }

    const updated = {
      ...observations,
      [tf]: { ...current, [field]: finalValue },
    };
    onUpdate("tf_observations", updated);
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-semibold"
          style={{ color: "var(--text-tertiary)" }}
        >
          Top Down Analysis
        </span>
        <div
          className="h-px flex-1"
          style={{ background: "var(--border-default)" }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {TIMEFRAMES.map((tf) => {
          const obs = observations[tf.id];
          const currentBias = obs?.bias;
          const currentNotes = obs?.notes || "";

          return (
            <div key={tf.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                {/* Timeframe Label */}
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {tf.label}
                </span>

                {/* Bias Toggle */}
                <div className="flex items-center gap-0.5">
                  <BiasIcon
                    active={currentBias === "Bullish"}
                    onClick={() => handleUpdate(tf.id, "bias", "Bullish")}
                    icon={ArrowUp}
                    activeColor="var(--profit-primary)"
                    activeBg="var(--profit-bg)"
                  />
                  <BiasIcon
                    active={currentBias === "Neutral"}
                    onClick={() => handleUpdate(tf.id, "bias", "Neutral")}
                    icon={Minus}
                    activeColor="var(--text-secondary)"
                    activeBg="var(--surface-elevated)"
                  />
                  <BiasIcon
                    active={currentBias === "Bearish"}
                    onClick={() => handleUpdate(tf.id, "bias", "Bearish")}
                    icon={ArrowDown}
                    activeColor="var(--loss-primary)"
                    activeBg="var(--loss-bg)"
                  />
                </div>
              </div>

              {/* Notes textarea */}
              <textarea
                placeholder="Analysis..."
                className={cn(
                  "w-full h-20 rounded-[var(--radius-default)] p-2.5 text-[11px]",
                  "resize-none focus:outline-none leading-relaxed font-mono",
                  "border transition-colors duration-150",
                  "focus:border-[var(--accent-primary)]",
                )}
                style={{
                  background: "var(--surface-elevated)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                }}
                value={currentNotes}
                onChange={(e) => handleUpdate(tf.id, "notes", e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BiasIcon({
  active,
  onClick,
  icon: Icon,
  activeColor,
  activeBg,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  activeColor: string;
  activeBg: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1 rounded-sm transition-all duration-150"
      style={{
        color: active ? activeColor : "var(--text-tertiary)",
        background: active ? activeBg : "transparent",
      }}
    >
      <Icon className="w-3 h-3" strokeWidth={active ? 2.5 : 1.5} />
    </button>
  );
}
