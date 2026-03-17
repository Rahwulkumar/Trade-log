"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import {
  X,
  Sparkles,
  Send,
  ChevronRight,
  RotateCcw,
  Bot,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";
import type { EconomicEvent } from "@/app/api/news/economic-calendar/route";
import type { NewsAnalysisResult } from "@/lib/api/gemini";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Currency pairs quick-picks ───────────────────────────────────────────────
const COMMON_PAIRS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCAD",
  "AUDUSD",
  "NZDUSD",
  "USDCHF",
  "GBPJPY",
  "EURJPY",
  "XAUUSD",
  "NQ",
  "ES",
];

// ─── Direction badge ──────────────────────────────────────────────────────────
function DirectionBadge({
  direction,
}: {
  direction: "LONG" | "SHORT" | "NEUTRAL";
}) {
  const cfg =
    direction === "LONG"
      ? {
          bg: "var(--profit-bg)",
          color: "var(--profit-primary)",
          label: "▲ LONG",
          glow: "rgba(3,98,76,0.3)",
        }
      : direction === "SHORT"
        ? {
            bg: "var(--loss-bg)",
            color: "var(--loss-primary)",
            label: "▼ SHORT",
            glow: "rgba(224,82,90,0.3)",
          }
        : {
            bg: "var(--surface-elevated)",
            color: "var(--text-tertiary)",
            label: "● NEUTRAL",
            glow: "transparent",
          };
  return (
    <span
      className="px-3 py-1 rounded-full text-[0.65rem] font-bold font-mono tracking-wider"
      style={{
        background: cfg.bg,
        color: cfg.color,
        boxShadow: `0 0 12px ${cfg.glow}`,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Risk badge ───────────────────────────────────────────────────────────────
function RiskBadge({ risk }: { risk: string }) {
  const color =
    risk === "Low"
      ? "var(--profit-primary)"
      : risk === "Medium"
        ? "#d97706"
        : risk === "High"
          ? "var(--loss-primary)"
          : "#dc2626";
  return (
    <span
      className="px-2 py-0.5 rounded text-[0.6rem] font-bold tracking-wider uppercase"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}50`,
      }}
    >
      {risk} Risk
    </span>
  );
}

// ─── Analysis Result Card ─────────────────────────────────────────────────────
function AnalysisCard({ result }: { result: NewsAnalysisResult }) {
  const verdictCls =
    result.verdict === "TRADE"
      ? "verdict-trade"
      : result.verdict === "CAUTION"
        ? "verdict-caution"
        : "verdict-avoid";

  const verdictConfig =
    result.verdict === "TRADE"
      ? { Icon: CheckCircle2, label: "TRADE", color: "var(--profit-primary)" }
      : result.verdict === "CAUTION"
        ? { Icon: AlertTriangle, label: "CAUTION", color: "#d97706" }
        : { Icon: XCircle, label: "AVOID", color: "var(--loss-primary)" };

  const verdictColor = verdictConfig.color;

  return (
    <div className="space-y-3 pb-4 card-enter">
      {/* ── Verdict hero ── */}
      <div className={`${verdictCls} rounded-[var(--radius-lg)] p-4`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className="flex items-center gap-2 text-xl font-black"
            style={{ color: verdictColor }}
          >
            <verdictConfig.Icon size={20} strokeWidth={2} />
            {verdictConfig.label}
          </span>
          <div className="flex flex-col items-end gap-1.5">
            <DirectionBadge direction={result.direction} />
            <RiskBadge risk={result.riskLevel} />
          </div>
        </div>
        <p
          className="text-[0.75rem] leading-relaxed font-medium"
          style={{ color: verdictColor, opacity: 0.9 }}
        >
          {result.verdictReason}
        </p>
      </div>

      {/* ── Event breakdown ── */}
      {result.eventAnalyses.length > 0 && (
        <div>
          <p
            className="text-[0.6rem] uppercase tracking-widest font-bold mb-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Event Breakdown
          </p>
          <div className="space-y-2">
            {result.eventAnalyses.map((ea, i) => {
              const impactCls =
                ea.impact === "High"
                  ? "impact-high"
                  : ea.impact === "Medium"
                    ? "impact-medium"
                    : "impact-low";
              return (
                <div
                  key={i}
                  className="glow-card p-3 rounded-[var(--radius-default)]"
                  style={{ background: "var(--surface-elevated)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[0.6rem] font-bold font-mono"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                        color: "#fff",
                      }}
                    >
                      {ea.currency}
                    </span>
                    <span
                      className="text-[0.68rem] font-semibold flex-1 truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {ea.event}
                    </span>
                    <span
                      className={`${impactCls} inline-flex items-center px-1.5 py-0.5 rounded text-[0.58rem] font-bold`}
                    >
                      {ea.impact}
                    </span>
                  </div>
                  <p
                    className="text-[0.7rem] leading-relaxed mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {ea.explanation}
                  </p>
                  <div className="flex items-start gap-1.5">
                    <ArrowUpRight
                      size={11}
                      style={{
                        color: "var(--accent-primary)",
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    />
                    <p
                      className="text-[0.68rem] font-medium italic"
                      style={{ color: "var(--accent-primary)", opacity: 0.9 }}
                    >
                      {ea.implication}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recommendation ── */}
      <div
        className="rounded-[var(--radius-default)] p-3.5 border"
        style={{
          background: "var(--surface-elevated)",
          borderColor: "var(--border-default)",
        }}
      >
        <p
          className="text-[0.6rem] uppercase tracking-widest font-bold mb-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          Recommendation
        </p>
        <p
          className="text-[0.74rem] leading-relaxed font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {result.recommendation}
        </p>
      </div>

      {/* ── Timing ── */}
      <div
        className="rounded-[var(--radius-default)] p-3.5"
        style={{
          background: "rgba(245,158,11,0.05)",
          border: "1px solid rgba(245,158,11,0.25)",
        }}
      >
        <p
          className="text-[0.6rem] uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"
          style={{ color: "#d97706" }}
        >
          <Clock size={10} style={{ color: "#d97706" }} />
          Timing Advice
        </p>
        <p
          className="text-[0.72rem] leading-relaxed font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {result.timingAdvice}
        </p>
      </div>

      {/* ── Pairs to watch ── */}
      {result.pairsToWatch?.length > 0 && (
        <div>
          <p
            className="text-[0.6rem] uppercase tracking-widest font-bold mb-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Pairs to Watch
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.pairsToWatch.map((p) => (
              <span
                key={p}
                className="font-mono px-2.5 py-1 rounded-[var(--radius-sm)] text-[0.69rem] font-bold"
                style={{
                  background: "var(--accent-soft)",
                  border: "1px solid var(--accent-primary)",
                  color: "var(--accent-primary)",
                  boxShadow: "0 0 8px var(--accent-glow)",
                }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Agent Panel ─────────────────────────────────────────────────────────
interface NewsAIAgentProps {
  events: EconomicEvent[];
  onClose: () => void;
}

export function NewsAIAgent({ events, onClose }: NewsAIAgentProps) {
  const [pair, setPair] = useState("EURUSD");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NewsAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const analyze = async () => {
    if (!pair.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze-news",
          events: events.slice(0, 15),
          pair: pair.toUpperCase(),
          question:
            question ||
            `Should I trade ${pair.toUpperCase()} based on today's events?`,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Analysis failed");
      setResult(data.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="flex flex-col h-full page-enter"
      style={{
        width: "420px",
        borderLeft: "1px solid var(--border-default)",
        background: "var(--surface)",
        flexShrink: 0,
      }}
    >
      {/* ── Header ── */}
      <div
        className="gradient-mesh-header px-4 py-3.5 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <div className="flex items-center gap-2.5 relative z-10">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-default)] glow-pulse"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
            }}
          >
            <Bot size={15} color="#fff" />
          </div>
          <div>
            <p
              className="font-bold text-[0.88rem] leading-none"
              style={{
                color: "var(--text-primary)",
              }}
            >
              News AI Agent
            </p>
            <p
              className="text-[0.6rem] font-medium mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Gemini · {events.length} events loaded
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="relative z-10 rounded-[var(--radius-sm)] p-0 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <X size={15} />
        </Button>
      </div>

      {/* ── Input Area ── */}
      <div
        className="p-4 space-y-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {/* Pair input */}
        <div>
          <label
            className="block text-[0.6rem] uppercase tracking-widest font-bold mb-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Instrument / Pair
          </label>
          <Input
            type="text"
            value={pair}
            onChange={(e) => setPair(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && !question && analyze()}
            placeholder="EURUSD, XAUUSD, NQ…"
            className="w-full rounded-[var(--radius-default)] border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-[0.84rem] font-mono font-bold tracking-[0.04em] text-[var(--text-primary)] shadow-none focus-visible:border-[var(--accent-primary)] focus-visible:ring-0"
            style={{
              caretColor: "var(--accent-primary)",
            }}
          />
          {/* Quick pair chips */}
          <div className="flex flex-wrap gap-1 mt-2">
            {COMMON_PAIRS.map((p) => (
              <Button
                key={p}
                type="button"
                onClick={() => setPair(p)}
                variant="ghost"
                size="sm"
                className="h-auto rounded px-1.5 py-0.5 font-mono text-[0.61rem] font-semibold"
                style={{
                  background: pair === p ? "var(--accent-soft)" : "transparent",
                  border: `1px solid ${pair === p ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                  color:
                    pair === p
                      ? "var(--accent-primary)"
                      : "var(--text-tertiary)",
                  boxShadow: pair === p ? "0 0 6px var(--accent-glow)" : "none",
                }}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>

        {/* Optional question */}
        <div>
          <label
            className="block text-[0.6rem] uppercase tracking-widest font-bold mb-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Question (optional)
          </label>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-default)] border transition-all"
            style={{
              background: "var(--surface-elevated)",
              borderColor: "var(--border-default)",
            }}
          >
            <Input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              placeholder={`Should I trade ${pair} right now?`}
              className="h-auto flex-1 border-0 bg-transparent px-0 py-0 text-[0.76rem] font-medium text-[var(--text-primary)] shadow-none focus-visible:ring-0"
            />
            <ChevronRight
              size={13}
              style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
            />
          </div>
        </div>

        {/* Analyze button */}
        <Button
          type="button"
          onClick={analyze}
          disabled={loading || !pair.trim()}
          className="h-auto w-full gap-2 rounded-[var(--radius-default)] py-2.5 text-[0.82rem] font-bold"
          style={{
            background:
              loading || !pair.trim()
                ? "var(--surface-elevated)"
                : "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
            color: loading || !pair.trim() ? "var(--text-tertiary)" : "#fff",
            boxShadow:
              loading || !pair.trim()
                ? "none"
                : "0 4px 16px var(--accent-glow)",
          }}
        >
          {loading ? (
            <>
              <Sparkles size={14} className="animate-pulse" />
              Analyzing…
            </>
          ) : (
            <>
              <Send size={14} />
              Analyze with Gemini
            </>
          )}
        </Button>
      </div>

      {/* ── Results Area ── */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Loading shimmer skeleton */}
        {loading && (
          <div className="space-y-3">
            <div className="h-24 w-full rounded-[var(--radius-lg)] shimmer" />
            <div className="space-y-2">
              {[100, 80, 90, 70].map((w, i) => (
                <div
                  key={i}
                  className="h-3 rounded-full shimmer"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
            <div className="h-16 w-full rounded-[var(--radius-default)] shimmer" />
            <p
              className="text-[0.71rem] font-medium text-center pt-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              Gemini is reading the calendar…
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div
            className="p-3.5 rounded-[var(--radius-default)] flex items-start gap-2.5"
            style={{
              background: "var(--loss-bg)",
              border: "1px solid var(--loss-primary)",
              boxShadow: "0 0 12px rgba(224,82,90,0.15)",
            }}
          >
            <p
              className="text-[0.75rem] font-medium flex-1"
              style={{ color: "var(--loss-primary)" }}
            >
              {error}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={analyze}
              className="h-7 w-7 shrink-0 rounded-full p-0 text-[var(--loss-primary)] hover:bg-transparent hover:opacity-80"
            >
              <RotateCcw size={13} style={{ color: "var(--loss-primary)" }} />
            </Button>
          </div>
        )}

        {/* Result */}
        {result && !loading && <AnalysisCard result={result} />}

        {/* Empty / welcome state */}
        {!loading && !result && !error && (
          <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-soft), var(--surface-elevated))",
                border: "1px solid var(--accent-primary)",
                boxShadow: "0 0 28px var(--accent-glow)",
              }}
            >
              <Sparkles size={24} style={{ color: "var(--accent-primary)" }} />
            </div>
            <div>
              <p
                className="font-bold mb-2"
                style={{
                  fontSize: "0.92rem",
                  color: "var(--text-primary)",
                }}
              >
                Ready to Analyze
              </p>
              <p
                className="text-[0.72rem] font-medium max-w-[260px] leading-relaxed"
                style={{ color: "var(--text-tertiary)" }}
              >
                Pick a pair above, optionally type a question, then let Gemini
                interpret the calendar and give you a clear verdict.
              </p>
            </div>
            <p
              className="text-[0.63rem] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              {format(new Date(), "HH:mm")} · {events.length} events in current
              view
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
