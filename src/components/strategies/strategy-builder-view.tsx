"use client";

import { CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AppPanel,
  SectionHeader,
} from "@/components/ui/page-primitives";
import { AppTextArea } from "@/components/ui/control-primitives";
import { InsetPanel, WidgetEmptyState } from "@/components/ui/surface-primitives";
import type {
  GeneratedStrategy,
  StrategyBuilderMessage,
} from "@/lib/api/client/ai";

interface StrategyBuilderViewProps {
  messages: StrategyBuilderMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  thinking: boolean;
  generated: GeneratedStrategy | null;
  saving: boolean;
  onSave: () => void;
}

export function StrategyBuilderView({
  messages,
  input,
  onInputChange,
  onSend,
  thinking,
  generated,
  saving,
  onSave,
}: StrategyBuilderViewProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_380px]">
      <AppPanel className="flex min-h-[460px] flex-col p-6">
        <SectionHeader
          title="Conversation"
          subtitle="Describe the setup, trigger, invalidation, and risk conditions. The assistant will turn that into a reusable strategy."
        />

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <InsetPanel
              key={message.id}
              tone={message.role === "user" ? "accent" : "default"}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background:
                      message.role === "user"
                        ? "var(--accent-muted)"
                        : "var(--surface)",
                    color:
                      message.role === "user"
                        ? "var(--accent-primary)"
                        : "var(--text-tertiary)",
                  }}
                >
                  {message.role === "user" ? (
                    <Send className="h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-label">
                    {message.role === "user" ? "Your prompt" : "Assistant"}
                  </p>
                  <p
                    className="mt-1 text-sm leading-relaxed"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {message.content}
                  </p>
                </div>
              </div>
            </InsetPanel>
          ))}

          {thinking ? (
            <InsetPanel>
              <div className="flex items-center gap-2 text-sm">
                <Loader2
                  className="h-4 w-4 animate-spin"
                  style={{ color: "var(--text-tertiary)" }}
                />
                <span style={{ color: "var(--text-secondary)" }}>
                  Assistant is generating strategy structure...
                </span>
              </div>
            </InsetPanel>
          ) : null}
        </div>

        <div
          className="mt-4 border-t pt-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <AppTextArea
            rows={4}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Describe your strategy setup. Include market structure, trigger, invalidation, and the risk conditions that make it valid."
            disabled={thinking}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p
              className="text-[0.72rem]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Press Ctrl/Cmd + Enter to send.
            </p>
            <Button
              type="button"
              onClick={onSend}
              disabled={!input.trim() || thinking}
            >
              <Send className="h-4 w-4" />
              Generate Strategy
            </Button>
          </div>
        </div>
      </AppPanel>

      <AppPanel className="p-6">
        {generated ? (
          <>
            <SectionHeader
              title={generated.name}
              subtitle={generated.description}
              action={
                <Button onClick={onSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save Strategy"
                  )}
                </Button>
              }
            />

            <div className="space-y-3">
              {generated.rules.map((rule, index) => (
                <InsetPanel
                  key={rule.id || `${generated.name}-${index}`}
                  tone={rule.required ? "accent" : "default"}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{
                        color: rule.required
                          ? "var(--accent-primary)"
                          : "var(--text-tertiary)",
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-label">
                        Rule {index + 1}
                        {rule.required ? " · required" : ""}
                      </p>
                      <p
                        className="mt-1 text-sm leading-relaxed"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {rule.text}
                      </p>
                    </div>
                  </div>
                </InsetPanel>
              ))}
            </div>
          </>
        ) : (
          <WidgetEmptyState
            title="No generated strategy yet"
            description="Send a prompt describing the setup. The assistant will return a named strategy and a reviewable ruleset here."
          />
        )}
      </AppPanel>
    </div>
  );
}
