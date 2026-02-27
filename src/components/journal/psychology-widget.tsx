"use client";

interface PsychologyWidgetProps {
  feelings: string;
  observations: string;
  onFeelingsChange: (value: string) => void;
  onObservationsChange: (value: string) => void;
}

const EMOTION_TAGS = [
  "Calm",
  "Focused",
  "Confident",
  "Patient",
  "FOMO",
  "Anxious",
  "Greedy",
  "Revenge",
  "Bored",
  "Overconfident",
  "Disciplined",
  "Hesitant",
];

export function PsychologyWidget({
  feelings,
  observations,
  onFeelingsChange,
  onObservationsChange,
}: PsychologyWidgetProps) {
  const toggleEmotion = (tag: string) => {
    const parts = feelings
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = parts.includes(tag)
      ? parts.filter((p) => p !== tag)
      : [...parts, tag];
    onFeelingsChange(next.join(", "));
  };

  const activeTags = feelings
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Emotional State */}
      <div className="space-y-3">
        <div>
          <span
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: "0.6rem", color: "var(--text-tertiary)" }}
          >
            Emotional State
          </span>
          <p
            style={{
              fontSize: "0.68rem",
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            Tag your emotions during this trade
          </p>
        </div>

        {/* Quick-select emotion tags */}
        <div className="flex flex-wrap gap-2">
          {EMOTION_TAGS.map((tag) => {
            const isNeg = [
              "FOMO",
              "Anxious",
              "Greedy",
              "Revenge",
              "Overconfident",
            ].includes(tag);
            const active = activeTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleEmotion(tag)}
                className="rounded-full px-3 py-1 font-medium transition-all duration-150"
                style={{
                  fontSize: "0.72rem",
                  background: active
                    ? isNeg
                      ? "var(--loss-bg)"
                      : "var(--accent-soft)"
                    : "var(--surface-elevated)",
                  color: active
                    ? isNeg
                      ? "var(--loss-primary)"
                      : "var(--accent-primary)"
                    : "var(--text-tertiary)",
                  border: `1px solid ${
                    active
                      ? isNeg
                        ? "var(--loss-primary)"
                        : "var(--accent-primary)"
                      : "var(--border-subtle)"
                  }`,
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* Freeform feelings */}
        <textarea
          value={feelings}
          onChange={(e) => onFeelingsChange(e.target.value)}
          placeholder="Describe your emotional state in detail…"
          className="w-full resize-none rounded-[10px] p-3 focus:outline-none leading-relaxed transition-all"
          style={{
            minHeight: "88px",
            fontSize: "0.78rem",
            color: "var(--text-primary)",
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-subtle)",
            lineHeight: 1.7,
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--border-active)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
        />
      </div>

      {/* Market Observations */}
      <div className="space-y-3">
        <div>
          <span
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: "0.6rem", color: "var(--text-tertiary)" }}
          >
            Market Observations
          </span>
          <p
            style={{
              fontSize: "0.68rem",
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            What did you see in price action? (liquidity, structure, session
            bias…)
          </p>
        </div>
        <textarea
          value={observations}
          onChange={(e) => onObservationsChange(e.target.value)}
          placeholder="Describe the market conditions, session behaviour, and key price levels you observed…"
          className="w-full resize-none rounded-[10px] p-3 focus:outline-none leading-relaxed transition-all"
          style={{
            minHeight: "120px",
            fontSize: "0.78rem",
            color: "var(--text-primary)",
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-subtle)",
            lineHeight: 1.7,
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--border-active)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
        />
      </div>
    </div>
  );
}
