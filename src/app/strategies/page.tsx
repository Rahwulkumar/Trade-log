"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Send,
  MoreHorizontal,
  ArrowUpRight,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Copy,
  RefreshCw,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getAllPlaybooksWithStats,
  createPlaybook,
  deletePlaybook,
  duplicatePlaybook,
  togglePlaybookActive,
} from "@/lib/api/playbooks";
import type { Playbook } from "@/lib/supabase/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface GeneratedStrategy {
  name: string;
  description: string;
  rules: { id: string; text: string; required: boolean }[];
}

interface PlaybookWithStats extends Playbook {
  stats?: {
    totalTrades: number;
    winRate: number;
    avgRMultiple: number;
    totalPnl: number;
  };
}

export default function StrategiesPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();

  const [playbooks, setPlaybooks] = useState<PlaybookWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [generated, setGenerated] = useState<GeneratedStrategy | null>(null);
  const [saving, setSaving] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && isConfigured && user) loadPlaybooks();
    else setLoading(false);
  }, [user, isConfigured, authLoading]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadPlaybooks() {
    setLoading(true);
    try {
      const stats = await getAllPlaybooksWithStats();
      const playbooksWithStats = stats.map((s) => ({
        ...s.playbook,
        stats: {
          totalTrades: s.totalTrades,
          winRate: s.winRate,
          avgRMultiple: s.avgRMultiple,
          totalPnl: s.totalPnl,
        },
      }));
      setPlaybooks(playbooksWithStats);
    } catch (e) {
      console.error("Failed to load strategies", e);
    } finally {
      setLoading(false);
    }
  }

  function startCreating() {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "What trading strategy would you like to create?",
      },
    ]);
    setGenerated(null);
    setInput("");
    setIsCreating(true);
  }

  async function send() {
    if (!input.trim() || thinking) return;
    setMessages((p) => [
      ...p,
      { id: Date.now().toString(), role: "user", content: input },
    ]);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-strategy",
          prompt: input,
          messages,
        }),
      });
      const data = await res.json();

      if (data.success && data.strategy) {
        setGenerated(data.strategy);
        setMessages((p) => [
          ...p,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `Created "${data.strategy.name}" with ${data.strategy.rules.length} rules.`,
          },
        ]);
      } else {
        setMessages((p) => [
          ...p,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: data.error || "Error",
          },
        ]);
      }
    } catch {
      setMessages((p) => [
        ...p,
        { id: Date.now().toString(), role: "assistant", content: "Failed" },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function save() {
    if (!generated) return;
    setSaving(true);
    try {
      await createPlaybook({
        name: generated.name,
        description: generated.description,
        rules: generated.rules.map((r) => r.text),
        is_active: true,
      });
      setIsCreating(false);
      setGenerated(null);
      await loadPlaybooks();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Are you sure you want to delete this strategy?")) return;
    try {
      await deletePlaybook(id);
      await loadPlaybooks();
    } catch (e) {
      console.error("Failed to delete", e);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      await duplicatePlaybook(id);
      await loadPlaybooks();
    } catch (err) {
      console.error("Failed to duplicate", err);
    }
  }

  async function handleToggleActive(id: string) {
    try {
      await togglePlaybookActive(id);
      await loadPlaybooks();
    } catch (err) {
      console.error("Failed to toggle active", err);
    }
  }

  if (!authLoading && (!isConfigured || !user)) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in</p>
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <a href="/auth/login">Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Sidebar */}
      <div className="w-56 border-r border-white/5 flex flex-col bg-void/50 backdrop-blur-sm">
        <div className="p-3">
          <Button
            onClick={startCreating}
            className={cn(
              "w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 justify-start",
              isCreating && "opacity-80",
            )}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Strategy
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {loading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground animate-pulse">
              Loading...
            </div>
          ) : (
            playbooks.map((p) => (
              <button
                key={p.id}
                className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-white/[0.03] hover:text-white rounded-md transition-colors flex items-center gap-2 group"
              >
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    p.is_active ? "bg-green-500/50" : "bg-white/10",
                  )}
                />
                <span className="truncate group-hover:translate-x-0.5 transition-transform">
                  {p.name}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-void">
        {isCreating ? (
          // ChatGPT-style chat
          <div className="h-full flex flex-col">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto py-8 space-y-6 px-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex gap-4",
                      m.role === "user" ? "flex-row-reverse" : "",
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium border border-white/5",
                        m.role === "user"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-purple-500/20",
                      )}
                    >
                      {m.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <svg
                          width="100%"
                          height="100%"
                          viewBox="0 0 1024 1024"
                          className="w-full h-full rounded-full"
                        >
                          <path
                            d="M512.049993 0.016664C229.336805 0.016664 0.116651 229.116001 0.116651 511.950007c0 174.135659 86.980341 327.898971 219.842209 420.345267 26.046609-90.704856 92.104674-158.833485 181.926311-189.616977 2.416352-0.829059 4.857701-1.620622 7.303216-2.395521 1.699779-0.533264 3.387059-1.087358 5.103502-1.595626a316.654602 316.654602 0 0 1 14.056503-3.841166 338.080979 338.080979 0 0 1 11.515167-2.657988c1.491472-0.312459 3.007942-0.599922 4.507747-0.895716a340.214035 340.214035 0 0 1 13.998177-2.470512 337.372738 337.372738 0 0 1 9.57792-1.337326c1.441479-0.187476 2.874626-0.38745 4.328603-0.549928a355.545372 355.545372 0 0 1 14.031506-1.353991H538.029944c4.728551 0.354121 9.398776 0.820726 14.044005 1.353991 1.424814 0.162479 2.837131 0.358287 4.253613 0.53743a361.594584 361.594584 0 0 1 14.38146 2.116391c3.212082 0.545762 6.390835 1.137352 9.557089 1.766437 1.349824 0.266632 2.703815 0.520766 4.049473 0.799895a327.582346 327.582346 0 0 1 26.067439 6.628304c1.299831 0.38745 2.574665 0.804062 3.861997 1.208176 2.970447 0.929046 5.915896 1.883088 8.832183 2.89129 89.467517 30.866814 155.250618 98.845463 181.268065 189.275355 132.745215-92.458794 219.642234-246.163781 219.642234-420.207785-0.004166-282.834006-229.220154-511.933342-511.937509-511.933343z m0 725.443042c-133.116001 0-241.02695-107.910949-241.026949-241.02695 0-1.266502 0.07499-2.516339 0.095821-3.774508-1.312329-152.371827 141.514907-244.059888 241.168598-237.252441h0.116651c102.153365-6.96576 249.88413 89.280042 241.264419 248.230178-0.254134 0.158313-0.529098 0.27913-0.783232 0.437443-4.045307 129.570629-110.281474 233.386278-240.835308 233.386278z"
                            fill="#D6E079"
                          />
                          <path
                            d="M512.287463 357.482619c-24.325999 103.44903-170.644447 178.443432-240.910299 134.153366a243.572452 243.572452 0 0 1-0.258299-10.977737c-0.020831 1.262336-0.095821 2.512173-0.095821 3.774508 0 133.111834 107.910949 241.02695 241.026949 241.02695 130.553834 0 236.790001-103.815649 240.835308-233.386278-70.674131 43.277698-216.238511-31.512563-240.597838-134.590809z"
                            fill="#FCE9EA"
                          />
                          <path
                            d="M566.051295 728.834266zM552.078115 726.934514c1.424814 0.162479 2.837131 0.358287 4.253613 0.53743-1.420648-0.179143-2.832964-0.374951-4.253613-0.53743zM439.867726 732.192162c1.491472-0.312459 3.007942-0.599922 4.507746-0.895716-1.499805 0.295795-3.016274 0.583257-4.507746 0.895716zM610.383023 738.782971c1.299831 0.38745 2.574665 0.804062 3.861997 1.208176-1.287332-0.404114-2.566333-0.820726-3.861997-1.208176zM453.515948 729.613332zM425.382112 735.604218zM467.951569 727.484442c1.441479-0.187476 2.874626-0.38745 4.328603-0.549928-1.453977 0.162479-2.887124 0.362453-4.328603 0.549928zM580.266111 731.354772c1.349824 0.266632 2.703815 0.520766 4.049473 0.799895-1.341492-0.27913-2.699648-0.533264-4.049473-0.799895zM512.049993 823.834397c-0.995704 0-1.978909-0.05416-2.96628-0.074991l2.96628 2.078896 2.957949-2.078896c-0.983205 0.024997-1.966411 0.07499-2.957949 0.074991z"
                            fill="#A0D9F6"
                          />
                          <path
                            d="M623.077203 742.882437c0.81656 0.27913 1.633121 0.574925 2.445515 0.862388a119.234475 119.234475 0 0 1-10.456971 22.092957c17.285249 26.21742 12.985809 141.631558-12.910819 123.417263l-45.110793-31.650046-44.994142-31.766697-45.110792 31.766697-44.994142 31.650046c-25.896628 18.214295-30.196068-97.199844-12.910819-123.413097a119.651087 119.651087 0 0 1-10.423642-22.005468c1.091525-0.38745 2.178883-0.783231 3.274573-1.154017-89.825804 30.783492-155.879703 98.907955-181.926311 189.616977 82.84338 57.646661 183.513605 91.467257 292.091133 91.467257 108.665018 0 209.410233-33.874756 292.291108-91.604739-26.017446-90.434058-91.800547-158.412707-181.263898-189.279521zM409.192553 740.282776c1.699779-0.53743 3.387059-1.087358 5.103502-1.595626-1.716443 0.508267-3.40789 1.062362-5.103502 1.595626z"
                            fill="#A0D9F6"
                          />
                          <path
                            d="M409.038406 765.841948c3.449551-5.228486 7.744825-6.932431 12.910819-3.299571l44.994142 31.650046 42.144512 29.571149c0.987371 0.020831 1.970577 0.07499 2.966281 0.074991 0.991538 0 1.974743-0.049993 2.957948-0.074991l42.036193-29.571149 45.110793-31.650046c5.161828-3.63286 9.461268-1.928916 12.910819 3.295405a119.109491 119.109491 0 0 0 10.456972-22.092957c-0.812394-0.287463-1.628955-0.583257-2.445515-0.862388-2.916287-1.008202-5.861737-1.966411-8.832184-2.89129-1.287332-0.404114-2.562166-0.820726-3.861997-1.208176a329.382112 329.382112 0 0 0-26.067439-6.628304c-1.341492-0.27913-2.695482-0.533264-4.049473-0.799895-3.166254-0.624919-6.345007-1.220674-9.557089-1.766437a349.579482 349.579482 0 0 0-14.38146-2.116391c-1.416482-0.179143-2.828798-0.374951-4.253613-0.53743a356.182789 356.182789 0 0 0-14.044005-1.353991H486.311678a356.311939 356.311939 0 0 0-14.031506 1.353991c-1.449811 0.162479-2.882958 0.362453-4.328603 0.549928a353.141518 353.141518 0 0 0-14.435621 2.124723 354.20388 354.20388 0 0 0-9.140476 1.683115c-1.499805 0.295795-3.016274 0.583257-4.507746 0.895716-3.874496 0.820726-7.711496 1.708111-11.515168 2.657988-0.991538 0.249967-1.983075 0.499935-2.970446 0.758234a323.374561 323.374561 0 0 0-11.086057 3.082932c-1.716443 0.508267-3.403723 1.058196-5.103502 1.595626a340.164041 340.164041 0 0 0-7.303216 2.395521c-1.095691 0.374951-2.183049 0.770733-3.274573 1.154017a119.017836 119.017836 0 0 0 10.423642 22.009634z"
                            fill="#FEFEFE"
                          />
                          <path
                            d="M602.154928 762.542377l-45.110793 31.650046-42.036193 29.571149-2.957949 2.078896 44.994142 31.766697 45.110793 31.650046c25.896628 18.214295 30.196068-97.199844 12.910819-123.417263-3.445385-5.228486-7.748991-6.932431-12.910819-3.299571zM466.939201 794.192423l-44.994142-31.650046c-5.161828-3.63286-9.461268-1.928916-12.910819 3.299571-17.285249 26.213253-12.985809 141.627392 12.910819 123.413097l44.994142-31.650046 45.110792-31.766697-2.96628-2.078896-42.144512-29.566983z"
                            fill="#FA9689"
                          />
                          <path
                            d="M512.287463 357.482619V243.405807c-99.653691-6.803281-242.480927 84.884781-241.168598 237.252441 0.029163 3.637026 0.062492 7.274053 0.258299 10.977737 70.265851 44.2859 216.580133-30.704335 240.910299-134.153366z"
                            fill="#FECF77"
                          />
                          <path
                            d="M512.287463 357.482619c24.359328 103.078245 169.923708 177.868507 240.597838 134.590809 0.2583-0.158313 0.533264-0.27913 0.783232-0.437443 8.619711-158.954303-139.115219-255.200104-241.264419-248.230178h-0.116651v114.076812z"
                            fill="#F7B970"
                          />
                        </svg>
                      )}
                    </div>
                    {/* Message */}
                    <div
                      className={cn(
                        "flex-1 max-w-[80%]",
                        m.role === "user" ? "text-right" : "",
                      )}
                    >
                      <div
                        className={cn(
                          "inline-block px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed",
                          m.role === "user"
                            ? "bg-blue-500/10 text-blue-100 rounded-br-none border border-blue-500/20"
                            : "bg-white/5 text-white/90 rounded-bl-none border border-white/10",
                        )}
                      >
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))}

                {thinking && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-medium border border-white/5 shadow-lg shadow-purple-500/20">
                      <svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 1024 1024"
                        className="w-full h-full rounded-full"
                      >
                        <path
                          d="M512.049993 0.016664C229.336805 0.016664 0.116651 229.116001 0.116651 511.950007c0 174.135659 86.980341 327.898971 219.842209 420.345267 26.046609-90.704856 92.104674-158.833485 181.926311-189.616977 2.416352-0.829059 4.857701-1.620622 7.303216-2.395521 1.699779-0.533264 3.387059-1.087358 5.103502-1.595626a316.654602 316.654602 0 0 1 14.056503-3.841166 338.080979 338.080979 0 0 1 11.515167-2.657988c1.491472-0.312459 3.007942-0.599922 4.507747-0.895716a340.214035 340.214035 0 0 1 13.998177-2.470512 337.372738 337.372738 0 0 1 9.57792-1.337326c1.441479-0.187476 2.874626-0.38745 4.328603-0.549928a355.545372 355.545372 0 0 1 14.031506-1.353991H538.029944c4.728551 0.354121 9.398776 0.820726 14.044005 1.353991 1.424814 0.162479 2.837131 0.358287 4.253613 0.53743a361.594584 361.594584 0 0 1 14.38146 2.116391c3.212082 0.545762 6.390835 1.137352 9.557089 1.766437 1.349824 0.266632 2.703815 0.520766 4.049473 0.799895a327.582346 327.582346 0 0 1 26.067439 6.628304c1.299831 0.38745 2.574665 0.804062 3.861997 1.208176 2.970447 0.929046 5.915896 1.883088 8.832183 2.89129 89.467517 30.866814 155.250618 98.845463 181.268065 189.275355 132.745215-92.458794 219.642234-246.163781 219.642234-420.207785-0.004166-282.834006-229.220154-511.933342-511.937509-511.933343z m0 725.443042c-133.116001 0-241.02695-107.910949-241.026949-241.02695 0-1.266502 0.07499-2.516339 0.095821-3.774508-1.312329-152.371827 141.514907-244.059888 241.168598-237.252441h0.116651c102.153365-6.96576 249.88413 89.280042 241.264419 248.230178-0.254134 0.158313-0.529098 0.27913-0.783232 0.437443-4.045307 129.570629-110.281474 233.386278-240.835308 233.386278z"
                          fill="#D6E079"
                        />
                        <path
                          d="M512.287463 357.482619c-24.325999 103.44903-170.644447 178.443432-240.910299 134.153366a243.572452 243.572452 0 0 1-0.258299-10.977737c-0.020831 1.262336-0.095821 2.512173-0.095821 3.774508 0 133.111834 107.910949 241.02695 241.026949 241.02695 130.553834 0 236.790001-103.815649 240.835308-233.386278-70.674131 43.277698-216.238511-31.512563-240.597838-134.590809z"
                          fill="#FCE9EA"
                        />
                        <path
                          d="M566.051295 728.834266zM552.078115 726.934514c1.424814 0.162479 2.837131 0.358287 4.253613 0.53743-1.420648-0.179143-2.832964-0.374951-4.253613-0.53743zM439.867726 732.192162c1.491472-0.312459 3.007942-0.599922 4.507746-0.895716-1.499805 0.295795-3.016274 0.583257-4.507746 0.895716zM610.383023 738.782971c1.299831 0.38745 2.574665 0.804062 3.861997 1.208176-1.287332-0.404114-2.566333-0.820726-3.861997-1.208176zM453.515948 729.613332zM425.382112 735.604218zM467.951569 727.484442c1.441479-0.187476 2.874626-0.38745 4.328603-0.549928-1.453977 0.162479-2.887124 0.362453-4.328603 0.549928zM580.266111 731.354772c1.349824 0.266632 2.703815 0.520766 4.049473 0.799895-1.341492-0.27913-2.699648-0.533264-4.049473-0.799895zM512.049993 823.834397c-0.995704 0-1.978909-0.05416-2.96628-0.074991l2.96628 2.078896 2.957949-2.078896c-0.983205 0.024997-1.966411 0.07499-2.957949 0.074991z"
                          fill="#A0D9F6"
                        />
                        <path
                          d="M623.077203 742.882437c0.81656 0.27913 1.633121 0.574925 2.445515 0.862388a119.234475 119.234475 0 0 1-10.456971 22.092957c17.285249 26.21742 12.985809 141.631558-12.910819 123.417263l-45.110793-31.650046-44.994142-31.766697-45.110792 31.766697-44.994142 31.650046c-25.896628 18.214295-30.196068-97.199844-12.910819-123.413097a119.651087 119.651087 0 0 1-10.423642-22.005468c1.091525-0.38745 2.178883-0.783231 3.274573-1.154017-89.825804 30.783492-155.879703 98.907955-181.926311 189.616977 82.84338 57.646661 183.513605 91.467257 292.091133 91.467257 108.665018 0 209.410233-33.874756 292.291108-91.604739-26.017446-90.434058-91.800547-158.412707-181.263898-189.279521zM409.192553 740.282776c1.699779-0.53743 3.387059-1.087358 5.103502-1.595626-1.716443 0.508267-3.40789 1.062362-5.103502 1.595626z"
                          fill="#A0D9F6"
                        />
                        <path
                          d="M409.038406 765.841948c3.449551-5.228486 7.744825-6.932431 12.910819-3.299571l44.994142 31.650046 42.144512 29.571149c0.987371 0.020831 1.970577 0.07499 2.966281 0.074991 0.991538 0 1.974743-0.049993 2.957948-0.074991l42.036193-29.571149 45.110793-31.650046c5.161828-3.63286 9.461268-1.928916 12.910819 3.295405a119.109491 119.109491 0 0 0 10.456972-22.092957c-0.812394-0.287463-1.628955-0.583257-2.445515-0.862388-2.916287-1.008202-5.861737-1.966411-8.832184-2.89129-1.287332-0.404114-2.562166-0.820726-3.861997-1.208176a329.382112 329.382112 0 0 0-26.067439-6.628304c-1.341492-0.27913-2.695482-0.533264-4.049473-0.799895-3.166254-0.624919-6.345007-1.220674-9.557089-1.766437a349.579482 349.579482 0 0 0-14.38146-2.116391c-1.416482-0.179143-2.828798-0.374951-4.253613-0.53743a356.182789 356.182789 0 0 0-14.044005-1.353991H486.311678a356.311939 356.311939 0 0 0-14.031506 1.353991c-1.449811 0.162479-2.882958 0.362453-4.328603 0.549928a353.141518 353.141518 0 0 0-14.435621 2.124723 354.20388 354.20388 0 0 0-9.140476 1.683115c-1.499805 0.295795-3.016274 0.583257-4.507746 0.895716-3.874496 0.820726-7.711496 1.708111-11.515168 2.657988-0.991538 0.249967-1.983075 0.499935-2.970446 0.758234a323.374561 323.374561 0 0 0-11.086057 3.082932c-1.716443 0.508267-3.403723 1.058196-5.103502 1.595626a340.164041 340.164041 0 0 0-7.303216 2.395521c-1.095691 0.374951-2.183049 0.770733-3.274573 1.154017a119.017836 119.017836 0 0 0 10.423642 22.009634z"
                          fill="#FEFEFE"
                        />
                        <path
                          d="M602.154928 762.542377l-45.110793 31.650046-42.036193 29.571149-2.957949 2.078896 44.994142 31.766697 45.110793 31.650046c25.896628 18.214295 30.196068-97.199844 12.910819-123.417263-3.445385-5.228486-7.748991-6.932431-12.910819-3.299571zM466.939201 794.192423l-44.994142-31.650046c-5.161828-3.63286-9.461268-1.928916-12.910819 3.299571-17.285249 26.213253-12.985809 141.627392 12.910819 123.413097l44.994142-31.650046 45.110792-31.766697-2.96628-2.078896-42.144512-29.566983z"
                          fill="#FA9689"
                        />
                        <path
                          d="M512.287463 357.482619V243.405807c-99.653691-6.803281-242.480927 84.884781-241.168598 237.252441 0.029163 3.637026 0.062492 7.274053 0.258299 10.977737 70.265851 44.2859 216.580133-30.704335 240.910299-134.153366z"
                          fill="#FECF77"
                        />
                        <path
                          d="M512.287463 357.482619c24.359328 103.078245 169.923708 177.868507 240.597838 134.590809 0.2583-0.158313 0.533264-0.27913 0.783232-0.437443 8.619711-158.954303-139.115219-255.200104-241.264419-248.230178h-0.116651v114.076812z"
                          fill="#F7B970"
                        />
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 px-4 py-3 bg-white/5 rounded-2xl rounded-bl-none border border-white/10">
                      <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                      <span
                        className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            </div>

            {/* Generated strategy card */}
            {generated && (
              <div className="border-t border-white/5 bg-void-surface/50 backdrop-blur-md">
                <div className="max-w-3xl mx-auto p-4">
                  <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-400 uppercase tracking-wide mb-1 font-semibold">
                          Strategy Ready
                        </p>
                        <p className="font-medium text-lg text-white">
                          {generated.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {generated.rules.length} rules defined
                        </p>
                      </div>
                      <Button
                        onClick={save}
                        disabled={saving}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save Strategy"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Input area - fixed at bottom */}
            <div className="border-t border-white/5 p-4 bg-void">
              <div className="max-w-3xl mx-auto">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !e.shiftKey && send()
                      }
                      placeholder="Describe your trading strategy (e.g., 'Break and retest of key levels')..."
                      className="w-full h-12 px-4 pr-12 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all"
                      disabled={thinking}
                    />
                    <button
                      onClick={send}
                      disabled={!input.trim() || thinking}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 text-muted-foreground hover:text-white"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Advanced Card Grid
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="headline-lg mb-2">Strategy Library</h1>
                <p className="text-muted-foreground">
                  Manage and track your trading playbooks
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="bg-transparent border-white/10 hover:bg-white/5"
                onClick={loadPlaybooks}
                title="Refresh"
              >
                <RefreshCw
                  className={cn("h-4 w-4", loading && "animate-spin")}
                />
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : playbooks.length === 0 ? (
              <Card className="bg-black/60 backdrop-blur-xl border-white/5 p-12 text-center max-w-lg mx-auto mt-10">
                <CardContent>
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    No strategies yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Use our AI assistant to help you create your first
                    structured trading strategy.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    onClick={startCreating}
                  >
                    <Plus className="h-4 w-4" />
                    Create with AI
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
                {playbooks.map((playbook) => (
                  <Card
                    key={playbook.id}
                    className={cn(
                      "bg-black/60 backdrop-blur-xl border-white/5 group hover:border-white/10 transition-colors",
                      !playbook.is_active && "opacity-60",
                    )}
                  >
                    <CardContent className="p-6 relative">
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "p-2.5 rounded-xl transition-colors",
                              (playbook.stats?.totalPnl || 0) >= 0
                                ? "bg-green-500/10 group-hover:bg-green-500/20"
                                : "bg-red-500/10 group-hover:bg-red-500/20",
                            )}
                          >
                            <BookOpen
                              className={cn(
                                "h-4.5 w-4.5",
                                (playbook.stats?.totalPnl || 0) >= 0
                                  ? "text-green-500"
                                  : "text-red-500",
                              )}
                            />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base leading-tight">
                              {playbook.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              {(playbook.stats?.totalPnl || 0) > 0 && (
                                <TrendingUp className="h-3 w-3 profit" />
                              )}
                              {(playbook.stats?.totalPnl || 0) < 0 && (
                                <TrendingDown className="h-3 w-3 loss" />
                              )}
                              {!playbook.is_active && (
                                <span className="badge-void text-[10px] py-0.5 h-auto">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-[#0a0a0a] border-white/10 min-w-[160px]"
                          >
                            {/* Note: Edit functionality would need a dialog, skipping for now as per prompt scope focus on UI/UX */}
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(playbook.id)}
                            >
                              <Copy className="h-4 w-4 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(playbook.id)}
                            >
                              {playbook.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem
                              className="text-red-500 focus:text-red-400 focus:bg-red-500/10"
                              onClick={() => remove(playbook.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-5">
                        {playbook.description || "No description provided."}
                      </p>

                      {/* Win Rate Progress */}
                      <div className="mb-5">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-muted-foreground">
                            Win Rate
                          </span>
                          <span className="font-medium text-white">
                            {(playbook.stats?.winRate || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            style={{
                              width: `${Math.min(playbook.stats?.winRate || 0, 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center mb-5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.02]">
                        <div>
                          <div className="text-base font-semibold text-white">
                            {playbook.stats?.totalTrades || 0}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                            Trades
                          </div>
                        </div>
                        <div>
                          <div className="text-base font-semibold text-white">
                            {(playbook.stats?.avgRMultiple || 0).toFixed(1)}R
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                            Avg R
                          </div>
                        </div>
                        <div>
                          <div
                            className={cn(
                              "text-base font-semibold",
                              (playbook.stats?.totalPnl || 0) >= 0
                                ? "profit"
                                : "loss",
                            )}
                          >
                            $
                            {Math.abs(
                              playbook.stats?.totalPnl || 0,
                            ).toLocaleString()}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                            P&L
                          </div>
                        </div>
                      </div>

                      {/* Rules Preview */}
                      {playbook.rules &&
                        Array.isArray(playbook.rules) &&
                        playbook.rules.length > 0 && (
                          <div className="flex items-center gap-2 mb-0">
                            <span className="text-xs text-muted-foreground">
                              {playbook.rules.length}{" "}
                              {playbook.rules.length === 1 ? "rule" : "rules"}{" "}
                              defined
                            </span>
                          </div>
                        )}

                      <button className="w-full py-2.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors flex items-center justify-center gap-2 border-t border-white/5 -mx-6 px-6 -mb-6 mt-5 hover:bg-white/[0.02]">
                        VIEW DETAILS
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
