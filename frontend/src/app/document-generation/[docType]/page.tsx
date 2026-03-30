"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabaseBrowserClient } from "@/lib/supabase/client";
import {
  DocgenChatMessage,
  streamDocgenChat,
  streamDocgenGenerate,
} from "@/lib/api";

// ── Static metadata ────────────────────────────────────────────────────────────

const DOC_META: Record<
  string,
  { title: string; icon: string; description: string }
> = {
  "articles-of-incorporation": {
    title: "Articles of Incorporation",
    icon: "🏛️",
    description: "Delaware C-Corp formation document",
  },
  bylaws: {
    title: "Corporate Bylaws",
    icon: "📋",
    description: "Internal governance manual",
  },
  "founders-agreement": {
    title: "Founders' Agreement",
    icon: "🤝",
    description: "Equity, roles & departure terms",
  },
  "stock-purchase-agreement": {
    title: "Stock Purchase Agreement",
    icon: "📄",
    description: "Founder share issuance",
  },
  "ip-assignment": {
    title: "IP Assignment Agreement",
    icon: "💡",
    description: "Transfer IP to the company",
  },
  piiia: {
    title: "PIIIA",
    icon: "🔒",
    description: "Employee IP & confidentiality",
  },
  safe: {
    title: "SAFE Agreement",
    icon: "💰",
    description: "YC Post-Money SAFE instrument",
  },
  "terms-privacy": {
    title: "Terms of Service & Privacy Policy",
    icon: "⚖️",
    description: "Platform legal agreements",
  },
  "offer-letter": {
    title: "Employee Offer Letter",
    icon: "📨",
    description: "At-will employment offer",
  },
  nda: {
    title: "Non-Disclosure Agreement",
    icon: "🤐",
    description: "Mutual confidentiality contract",
  },
};

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = "qa" | "generating" | "done";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DocGenPage() {
  const params = useParams();
  const router = useRouter();
  const docType = params.docType as string;
  const meta = DOC_META[docType];

  const supabase = supabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [phase, setPhase] = useState<Phase>("qa");
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [readyToGenerate, setReadyToGenerate] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    );
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, generatedDoc]);

  // ── Initialize: AI sends first question ──────────────────────────────────

  const startChat = useCallback(async () => {
    if (!session || initialized.current || !meta) return;
    initialized.current = true;

    const assistantId = `msg-${Date.now()}`;
    setMessages([
      {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
      },
    ]);

    let accum = "";
    try {
      await streamDocgenChat(
        session.access_token,
        docType,
        [],
        {
          onToken: (delta) => {
            accum += delta;
            setMessages([
              {
                id: assistantId,
                role: "assistant",
                content: accum,
                streaming: true,
              },
            ]);
          },
          onDone: () => {
            const isReady = accum.includes("[READY_TO_GENERATE]");
            setMessages([
              {
                id: assistantId,
                role: "assistant",
                content: accum,
                streaming: false,
              },
            ]);
            if (isReady) setReadyToGenerate(true);
          },
          onError: (err) => setError(err.message),
        }
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }, [session, docType, meta]);

  useEffect(() => {
    if (!authLoading && session) {
      startChat();
    }
  }, [authLoading, session, startChat]);

  // ── Send user message ─────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!inputValue.trim() || isSending || !session || phase !== "qa") return;

    const userContent = inputValue.trim();
    setInputValue("");
    setIsSending(true);
    setError(null);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userContent,
    };
    const assistantId = `assistant-${Date.now() + 1}`;

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);

    // Build conversation history (exclude streaming placeholder)
    const history: DocgenChatMessage[] = messages
      .filter((m) => !m.streaming)
      .map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: userContent });

    let accum = "";
    try {
      await streamDocgenChat(session.access_token, docType, history, {
        onToken: (delta) => {
          accum += delta;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: accum, streaming: true }
                : m
            )
          );
        },
        onDone: () => {
          const isReady = accum.includes("[READY_TO_GENERATE]");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: accum, streaming: false }
                : m
            )
          );
          if (isReady) setReadyToGenerate(true);
        },
        onError: (err) => setError(err.message),
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // ── Generate document ─────────────────────────────────────────────────────

  const generateDocument = async () => {
    if (!session || phase !== "qa") return;
    setPhase("generating");
    setError(null);

    // Build context summary from conversation
    const context = messages
      .filter((m) => !m.streaming)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    let accum = "";
    try {
      await streamDocgenGenerate(session.access_token, docType, context, {
        onToken: (delta) => {
          accum += delta;
          setGeneratedDoc(accum);
        },
        onDone: () => {
          setGeneratedDoc(accum);
          setPhase("done");
        },
        onError: (err) => {
          setError(err.message);
          setPhase("qa");
        },
      });
    } catch (err) {
      setError((err as Error).message);
      setPhase("qa");
    }
  };

  // ── Copy & Download ───────────────────────────────────────────────────────

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedDoc);
  };

  const downloadDoc = () => {
    const blob = new Blob([generatedDoc], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docType}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Handle Enter key ──────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1117]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    router.push("/");
    return null;
  }

  if (!meta) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1117] text-white">
        <div className="text-center">
          <p className="text-lg text-white/60">Unknown document type.</p>
          <button
            onClick={() => router.push("/document-generation")}
            className="mt-4 text-indigo-400 hover:text-indigo-300"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0f1117] text-white">
      {/* Top bar */}
      <div className="border-b border-white/10 bg-[#0f1117]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.push("/document-generation")}
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            ←
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="text-2xl">{meta.icon}</span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {meta.title}
              </div>
              <div className="text-xs text-white/40">{meta.description}</div>
            </div>
          </div>

          {/* Phase indicator */}
          {phase === "generating" && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              Generating…
            </div>
          )}
          {phase === "done" && (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <span>✓</span> Document ready
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Q&A panel */}
        <div
          className={`flex flex-col transition-all duration-300 ${
            phase === "done" ? "w-1/2 border-r border-white/10" : "w-full"
          }`}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm">
                      {meta.icon}
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-500/20 text-white"
                        : "bg-[#1a1c24] text-white/90"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content.replace(/\[READY_TO_GENERATE\]/g, "")}
                        </ReactMarkdown>
                        {msg.streaming && (
                          <span className="inline-block h-4 w-0.5 animate-pulse bg-indigo-400 align-text-bottom ml-0.5" />
                        )}
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {/* Generate button */}
              {readyToGenerate && phase === "qa" && !isSending && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={generateDocument}
                    className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    ✨ Generate Document
                  </button>
                </div>
              )}

              {/* Generating indicator */}
              {phase === "generating" && (
                <div className="flex justify-center pt-4">
                  <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-3 text-sm text-amber-300">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                    Generating your {meta.title}…
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Input */}
          {phase === "qa" && (
            <div className="border-t border-white/10 bg-[#0f1117] px-6 py-4">
              <div className="mx-auto max-w-3xl">
                <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-[#1a1c24] px-4 py-3 focus-within:border-indigo-500/50">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your answer…"
                    rows={1}
                    disabled={isSending}
                    className="flex-1 resize-none bg-transparent text-sm text-white placeholder-white/30 outline-none disabled:opacity-50"
                    style={{ minHeight: "1.5rem", maxHeight: "8rem" }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || isSending}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40"
                  >
                    {isSending ? (
                      <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    ) : (
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 19V5m-7 7 7-7 7 7"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-center text-xs text-white/25">
                  Press Enter to send · Shift+Enter for new line
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Generated document panel */}
        {(phase === "generating" || phase === "done") && (
          <div className="flex w-full flex-col overflow-hidden md:w-1/2">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-3">
              <span className="text-sm font-medium text-white/70">
                Generated Document
              </span>
              {phase === "done" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
                  >
                    Copy
                  </button>
                  <button
                    onClick={downloadDoc}
                    className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-300 transition hover:bg-indigo-500/20"
                  >
                    Download
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {generatedDoc}
                </ReactMarkdown>
                {phase === "generating" && (
                  <span className="inline-block h-4 w-0.5 animate-pulse bg-indigo-400 align-text-bottom ml-0.5" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
