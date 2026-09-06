"use client";

import {
  ArrowUp,
  Brain,
  CheckCircle2,
  Command,
  MessageSquare,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { FormEvent, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "I'm your Founder OS CEO. Tell me what's happening in the business and I'll help you identify the highest-leverage priority.",
  },
];

const suggestions = [
  "What should I prioritize this week?",
  "My pipeline is almost empty.",
  "Help me identify our biggest bottleneck.",
];

export function FounderChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(message?: string) {
    const text = (message ?? input).trim();

    if (!text || loading) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        response?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(
          data.response || "The Founder OS backend returned an error.",
        );
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "No response was returned.",
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          error instanceof Error
            ? `I couldn't process that request: ${error.message}`
            : "I couldn't process that request.",
      };

      setMessages((current) => [...current, assistantMessage]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="hidden w-64 shrink-0 border-r border-white/[0.07] bg-black/20 p-5 lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
            <Sparkles size={17} />
          </div>

          <div>
            <p className="text-sm font-semibold tracking-tight">
              Founder OS
            </p>
            <p className="text-[11px] text-zinc-500">Strategic operating system</p>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          <NavItem icon={<MessageSquare size={16} />} label="CEO Chat" active />
          <NavItem icon={<Target size={16} />} label="Goals" />
          <NavItem icon={<Brain size={16} />} label="Memory" />
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-zinc-300">
              Systems operational
            </span>
          </div>

          <p className="mt-2 text-[11px] leading-5 text-zinc-500">
            Kernel, memory and CEO strategy layer are connected.
          </p>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.07] px-5 sm:px-8">
          <div>
            <p className="text-sm font-medium">CEO</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-zinc-500">
                Strategic mode
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-white/[0.07] px-3 py-1.5 text-[11px] text-zinc-500 sm:flex">
            <Command size={12} />
            Founder OS
          </div>
        </header>

        <div className="founder-scrollbar flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 pb-36 pt-8 sm:px-8">
            <div className="mb-10 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/30">
                <Sparkles size={23} />
              </div>

              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                What&apos;s the most important thing
                <br className="hidden sm:block" /> happening in your company?
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500">
                Your CEO layer uses company context, founder memory and
                strategic signals to help determine what deserves attention.
              </p>
            </div>

            <div className="space-y-7">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {loading && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05]">
                    <Sparkles size={14} />
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="founder-pulse h-1.5 w-1.5 rounded-full bg-zinc-300" />
                      <span
                        className="founder-pulse h-1.5 w-1.5 rounded-full bg-zinc-300"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="founder-pulse h-1.5 w-1.5 rounded-full bg-zinc-300"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {messages.length === 1 && !loading && (
              <div className="mt-8 grid gap-2 sm:grid-cols-3">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-left text-xs leading-5 text-zinc-400 transition hover:border-white/15 hover:bg-white/[0.045] hover:text-zinc-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent px-4 pb-5 pt-14 lg:left-64">
          <form
            onSubmit={handleSubmit}
            className="pointer-events-auto w-full max-w-3xl"
          >
            <div className="rounded-2xl border border-white/[0.09] bg-zinc-900/90 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  disabled={loading}
                  rows={1}
                  placeholder="Tell your CEO what's happening..."
                  className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp size={17} />
                </button>
              </div>
            </div>

            <p className="mt-2 text-center text-[10px] text-zinc-700">
              Founder OS can make mistakes. Verify important business decisions.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition ${
        active
          ? "bg-white/[0.07] text-zinc-100"
          : "text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05]">
          <Sparkles size={14} />
        </div>
      )}

      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${
          isUser
            ? "bg-white text-zinc-950"
            : "border border-white/[0.07] bg-white/[0.025] text-zinc-300"
        }`}
      >
        {message.content}
      </div>

      {isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05]">
          <User size={14} />
        </div>
      )}
    </div>
  );
}
