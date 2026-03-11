"use client";

import { useCallback, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { streamDebate } from "@/lib/api";
import type { DebateConsensusCheck, DebateModel, DebateTurnMessage } from "@/lib/types";

interface AgenticDebateChatProps {
  accessToken: string;
  onBackToChat: () => void;
  onDebateSaved?: (conversationId: string) => void;
  onOpenSavedConversation?: (conversationId: string) => void;
}

type DebatePhase = "setup" | "running" | "done" | "error";

let _msgCounter = 0;
function nextId() {
  return `debate-msg-${++_msgCounter}`;
}

export default function AgenticDebateChat({
  accessToken,
  onBackToChat,
  onDebateSaved,
  onOpenSavedConversation,
}: AgenticDebateChatProps) {
  const [phase, setPhase] = useState<DebatePhase>("setup");

  // Setup state
  const [topic, setTopic] = useState("");
  const [targetConsensus, setTargetConsensus] = useState(75);
  const [maxRounds, setMaxRounds] = useState(8);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Debate state
  const [messages, setMessages] = useState<DebateTurnMessage[]>([]);
  const [consensusHistory, setConsensusHistory] = useState<DebateConsensusCheck[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [streamingModel, setStreamingModel] = useState<DebateModel | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [finalConsensus, setFinalConsensus] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedConversationId, setSavedConversationId] = useState<string | null>(null);

  const debatePanelRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (debatePanelRef.current) {
        debatePanelRef.current.scrollTop = debatePanelRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  const handleReset = () => {
    setPhase("setup");
    setTopic("");
    setTargetConsensus(75);
    setMaxRounds(8);
    setSelectedFile(null);
    setIsDragging(false);
    setSetupError(null);
    setMessages([]);
    setConsensusHistory([]);
    setCurrentRound(0);
    setStreamingModel(null);
    setIsSynthesizing(false);
    setFinalConsensus(0);
    setErrorMessage(null);
    setSavedConversationId(null);
  };

  const handleBackToChat = () => {
    if (phase === "running") return;
    handleReset();
    onBackToChat();
  };

  const handleOpenSavedConversation = () => {
    if (!savedConversationId || !onOpenSavedConversation) return;
    handleReset();
    onOpenSavedConversation(savedConversationId);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSetupError(null);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSetupError(null);
    }
  };

  const handleStartDebate = async () => {
    if (!topic.trim() && !selectedFile) {
      setSetupError("Enter a topic or upload a document to debate.");
      return;
    }

    setSetupError(null);
    setPhase("running");
    setMessages([]);
    setConsensusHistory([]);
    setCurrentRound(0);
    setFinalConsensus(0);
    setSavedConversationId(null);

    const formData = new FormData();
    formData.append("topic", topic.trim());
    formData.append("target_consensus", String(targetConsensus));
    formData.append("max_rounds", String(maxRounds));
    if (selectedFile) formData.append("file", selectedFile);

    const streamingIdRef = { current: "" };

    try {
      await streamDebate(accessToken, formData, {
        onRoundStart: (round) => {
          setCurrentRound(round);
          scrollToBottom();
        },
        onModelTurnStart: (model, round) => {
          const id = nextId();
          streamingIdRef.current = id;
          setStreamingModel(model);
          setMessages((prev) => [...prev, { id, model, round, content: "", isStreaming: true }]);
          scrollToBottom();
        },
        onToken: (_model, delta) => {
          const id = streamingIdRef.current;
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m)),
          );
          scrollToBottom();
        },
        onModelTurnEnd: () => {
          const id = streamingIdRef.current;
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, isStreaming: false } : m)),
          );
          setStreamingModel(null);
          streamingIdRef.current = "";
        },
        onConsensusCheck: (round, percentage, reached) => {
          setConsensusHistory((prev) => [...prev, { round, percentage, reached }]);
          scrollToBottom();
        },
        onSynthesisStart: () => {
          setIsSynthesizing(true);
          const id = nextId();
          streamingIdRef.current = id;
          setStreamingModel("synthesis");
          setMessages((prev) => [
            ...prev,
            { id, model: "synthesis", round: 0, content: "", isStreaming: true },
          ]);
          scrollToBottom();
        },
        onDone: (_roundsCompleted, fc, _synthesis, conversationId) => {
          setMessages((prev) =>
            prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
          );
          setStreamingModel(null);
          setIsSynthesizing(false);
          setFinalConsensus(fc);
          if (conversationId) {
            setSavedConversationId(conversationId);
            onDebateSaved?.(conversationId);
          }
          setPhase("done");
          scrollToBottom();
        },
        onError: (err) => {
          setErrorMessage(err.message);
          setPhase("error");
        },
      });
    } catch (err) {
      setErrorMessage((err as Error).message || "Debate failed.");
      setPhase("error");
    }
  };

  const modelLabel = (model: DebateModel) => {
    if (model === "openai") return "GPT";
    if (model === "claude") return "Claude";
    return "Synthesis";
  };

  const modelColor = (model: DebateModel) => {
    if (model === "openai") return "border-emerald-500/50 bg-emerald-500/10";
    if (model === "claude") return "border-violet-500/50 bg-violet-500/10";
    return "border-amber-500/50 bg-amber-500/15";
  };

  const modelBadgeColor = (model: DebateModel) => {
    if (model === "openai") return "bg-emerald-500/20 text-emerald-300";
    if (model === "claude") return "bg-violet-500/20 text-violet-300";
    return "bg-amber-500/20 text-amber-300";
  };

  const latestConsensus = consensusHistory[consensusHistory.length - 1];

  return (
    <div className="app-bg flex min-h-0 flex-1 flex-col p-4 sm:p-6">
      <div className="app-surface app-border app-text mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-3xl border shadow-2xl">
        <div className="app-border shrink-0 flex items-center justify-between border-b px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <span className="text-2xl">⚔️</span> Agentic Debate
            </h2>
            <p className="app-muted mt-0.5 text-sm">
              GPT vs Claude — they argue until consensus is reached
            </p>
          </div>
          <button
            onClick={handleBackToChat}
            disabled={phase === "running"}
            className="app-border app-muted rounded-full border px-4 py-2 text-sm transition hover:app-border-strong hover:app-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back to Chat
          </button>
        </div>

        {phase === "setup" && (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            <div>
              <label className="app-subtle text-xs uppercase tracking-wide">
                Debate Topic / Question
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Is this NDA clause enforceable? What are the key risks in this contract?"
                rows={3}
                className="app-input app-text app-border mt-2 w-full resize-none rounded-2xl border px-4 py-3 text-sm placeholder:app-subtle focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="app-subtle text-xs uppercase tracking-wide">
                Document (Optional — PDF, DOCX, TXT)
              </label>
              {selectedFile ? (
                <div className="app-border app-surface-2 mt-2 flex items-center justify-between rounded-2xl border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                      📄
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="app-subtle text-xs">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 transition"
                  >
                    <XMarkIcon className="h-5 w-5 text-slate-400" />
                  </button>
                </div>
              ) : (
                <div
                  className={`mt-2 rounded-2xl border border-dashed p-5 transition ${
                    isDragging ? "border-indigo-400 bg-indigo-500/15" : "app-border app-surface-2"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <label className="app-muted flex cursor-pointer flex-col items-center justify-center gap-1 text-center text-sm">
                    <span className="text-base font-medium">Drop document or browse</span>
                    <span className="app-subtle text-xs">PDF, DOCX, TXT — up to 25 MB</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".pdf,.docx,.doc,.txt"
                    />
                  </label>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="app-subtle text-xs uppercase tracking-wide">Target Consensus</label>
                <span className="text-sm font-semibold text-indigo-300">{targetConsensus}%</span>
              </div>
              <input
                type="range"
                min={30}
                max={100}
                step={5}
                value={targetConsensus}
                onChange={(e) => setTargetConsensus(Number(e.target.value))}
                className="mt-2 w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="app-subtle text-xs uppercase tracking-wide">Max Debate Rounds</label>
                <span className="text-sm font-semibold text-slate-300">{maxRounds}</span>
              </div>
              <input
                type="range"
                min={2}
                max={15}
                step={1}
                value={maxRounds}
                onChange={(e) => setMaxRounds(Number(e.target.value))}
                className="mt-2 w-full accent-slate-400"
              />
            </div>

            {setupError && <p className="text-sm text-red-400">{setupError}</p>}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleStartDebate}
                className="rounded-full bg-indigo-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
              >
                Start Debate ⚔️
              </button>
            </div>
          </div>
        )}

        {(phase === "running" || phase === "done") && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="app-border flex items-center justify-between border-b px-5 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                {phase === "running" ? (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                ) : (
                  <span className="flex h-2 w-2 rounded-full bg-amber-400" />
                )}
                <span className="app-muted text-sm">
                  {phase === "running"
                    ? isSynthesizing
                      ? "Generating synthesis…"
                      : `Round ${currentRound} — ${
                          streamingModel === "openai"
                            ? "GPT"
                            : streamingModel === "claude"
                              ? "Claude"
                              : "…"
                        } arguing`
                    : `Debate complete — ${finalConsensus}% consensus reached`}
                </span>
              </div>
              {latestConsensus && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${latestConsensus.percentage}%`,
                        backgroundColor: latestConsensus.percentage >= targetConsensus ? "#f59e0b" : "#6366f1",
                      }}
                    />
                  </div>
                  <span className="app-subtle text-xs">
                    {latestConsensus.percentage}% / {targetConsensus}%
                  </span>
                </div>
              )}
            </div>

            <div
              ref={debatePanelRef}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 pb-6 sm:px-6"
            >
              {messages.map((msg) => (
                <div key={msg.id} className={`rounded-2xl border px-5 py-4 ${modelColor(msg.model)}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${modelBadgeColor(msg.model)}`}>
                        {modelLabel(msg.model)}
                      </span>
                      {msg.round > 0 ? (
                        <span className="app-subtle text-xs">Round {msg.round}</span>
                      ) : null}
                    </div>
                    {msg.isStreaming && (
                      <span
                        className="flex h-1.5 w-1.5 rounded-full animate-pulse"
                        style={{
                          backgroundColor:
                            msg.model === "openai" ? "#34d399" : msg.model === "claude" ? "#a78bfa" : "#f59e0b",
                        }}
                      />
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                    {msg.content}
                    {msg.isStreaming && (
                      <span
                        className="ml-0.5 inline-block h-4 w-0.5 animate-pulse"
                        style={{
                          backgroundColor:
                            msg.model === "openai" ? "#34d399" : msg.model === "claude" ? "#a78bfa" : "#f59e0b",
                        }}
                      />
                    )}
                  </p>
                </div>
              ))}

              {consensusHistory.map((c, i) => (
                <div key={`${c.round}-${i}`} className="flex items-center gap-3 px-2">
                  <div className="h-px flex-1 bg-white/5" />
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                      c.reached ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-slate-400"
                    }`}
                  >
                    {c.reached ? "✓" : "≈"} Round {c.round} consensus: {c.percentage}%
                    {c.reached ? " — Target reached!" : ""}
                  </span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
              ))}
            </div>

            {phase === "done" && (
              <div className="app-border shrink-0 flex justify-end gap-3 border-t px-5 py-4 sm:px-6">
                {savedConversationId && onOpenSavedConversation && (
                  <button
                    onClick={handleOpenSavedConversation}
                    className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                  >
                    Open in Chat History
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="app-border app-text rounded-full border px-5 py-2 text-sm transition hover:app-border-strong"
                >
                  New Debate
                </button>
                <button
                  onClick={handleBackToChat}
                  className="rounded-full bg-indigo-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
                >
                  Back to Chat
                </button>
              </div>
            )}
          </div>
        )}

        {phase === "error" && (
          <div className="space-y-4 p-5 sm:p-6">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4">
              <p className="text-sm text-red-300">⚠️ {errorMessage || "An error occurred during the debate."}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleReset}
                className="rounded-full border border-white/10 px-5 py-2 text-sm text-white transition hover:border-white/30"
              >
                Try Again
              </button>
              <button
                onClick={handleBackToChat}
                className="rounded-full bg-white/10 px-6 py-2 text-sm text-white hover:bg-white/15 transition"
              >
                Back to Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

