"use client";

import { Fragment, useCallback, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { streamDebate } from "@/lib/api";
import type { DebateConsensusCheck, DebateModel, DebateTurnMessage } from "@/lib/types";

interface AgenticDebateModalProps {
  open: boolean;
  onClose: () => void;
  accessToken: string;
}

type DebatePhase = "setup" | "running" | "done" | "error";

let _msgCounter = 0;
function nextId() {
  return `msg-${++_msgCounter}`;
}

export default function AgenticDebateModal({ open, onClose, accessToken }: AgenticDebateModalProps) {
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
  const [synthesis, setSynthesis] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [finalConsensus, setFinalConsensus] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setSynthesis("");
    setIsSynthesizing(false);
    setFinalConsensus(0);
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (phase !== "running") {
      handleReset();
      onClose();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setSetupError(null); }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) { setSelectedFile(file); setSetupError(null); }
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
    setSynthesis("");
    setFinalConsensus(0);

    const formData = new FormData();
    formData.append("topic", topic.trim());
    formData.append("target_consensus", String(targetConsensus));
    formData.append("max_rounds", String(maxRounds));
    if (selectedFile) formData.append("file", selectedFile);

    // Track the currently-streaming message id via a ref so handlers always see the latest value
    const streamingIdRef = { current: "" };

    try {
      await streamDebate(accessToken, formData, {
        onDebateStart: () => {},
        onRoundStart: (round) => {
          setCurrentRound(round);
          scrollToBottom();
        },
        onModelTurnStart: (model, round) => {
          const id = nextId();
          streamingIdRef.current = id;
          setStreamingModel(model);
          setMessages((prev) => [
            ...prev,
            { id, model, round, content: "", isStreaming: true },
          ]);
          scrollToBottom();
        },
        onToken: (_model, delta) => {
          const id = streamingIdRef.current;
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m)),
          );
          scrollToBottom();
        },
        onModelTurnEnd: (_model, _round, _content) => {
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
        onDone: (roundsCompleted, fc, syn) => {
          setMessages((prev) =>
            prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
          );
          setStreamingModel(null);
          setIsSynthesizing(false);
          setSynthesis(syn);
          setFinalConsensus(fc);
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
    <Transition show={open} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0b0e16] text-white shadow-2xl">

                {/* ── Header ── */}
                <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
                  <div>
                    <Dialog.Title className="text-xl font-semibold flex items-center gap-2">
                      <span className="text-2xl">⚔️</span> Agentic Debate
                    </Dialog.Title>
                    <p className="mt-0.5 text-sm text-slate-400">
                      GPT vs Claude — they argue until consensus is reached
                    </p>
                  </div>
                  {phase !== "running" && (
                    <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 transition">
                      <XMarkIcon className="h-5 w-5 text-slate-400" />
                    </button>
                  )}
                </div>

                {/* ── Setup Phase ── */}
                {phase === "setup" && (
                  <div className="p-6 space-y-5">
                    {/* Topic */}
                    <div>
                      <label className="text-xs uppercase tracking-wide text-slate-500">
                        Debate Topic / Question
                      </label>
                      <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Is this NDA clause enforceable? What are the key risks in this contract?"
                        rows={3}
                        className="mt-2 w-full resize-none rounded-2xl border border-white/15 bg-[#0d0f16] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    {/* Document Drop */}
                    <div>
                      <label className="text-xs uppercase tracking-wide text-slate-500">
                        Document (Optional — PDF, DOCX, TXT)
                      </label>
                      {selectedFile ? (
                        <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">📄</div>
                            <div>
                              <p className="text-sm font-medium">{selectedFile.name}</p>
                              <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button onClick={() => setSelectedFile(null)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 transition">
                            <XMarkIcon className="h-5 w-5 text-slate-400" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`mt-2 rounded-2xl border border-dashed p-5 transition ${isDragging ? "border-indigo-400 bg-indigo-500/15" : "border-white/15 bg-white/5"}`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 text-center text-sm text-slate-300">
                            <span className="text-base font-medium">Drop document or browse</span>
                            <span className="text-xs text-slate-500">PDF, DOCX, TXT — up to 25 MB</span>
                            <input type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.docx,.doc,.txt" />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Target Consensus */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs uppercase tracking-wide text-slate-500">Target Consensus</label>
                        <span className="text-sm font-semibold text-indigo-300">{targetConsensus}%</span>
                      </div>
                      <input
                        type="range"
                        min={30} max={100} step={5}
                        value={targetConsensus}
                        onChange={(e) => setTargetConsensus(Number(e.target.value))}
                        className="mt-2 w-full accent-indigo-500"
                      />
                      <div className="mt-1 flex justify-between text-xs text-slate-500">
                        <span>30% — quick</span>
                        <span>100% — full agreement</span>
                      </div>
                    </div>

                    {/* Max Rounds */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs uppercase tracking-wide text-slate-500">Max Debate Rounds</label>
                        <span className="text-sm font-semibold text-slate-300">{maxRounds}</span>
                      </div>
                      <input
                        type="range"
                        min={2} max={15} step={1}
                        value={maxRounds}
                        onChange={(e) => setMaxRounds(Number(e.target.value))}
                        className="mt-2 w-full accent-slate-400"
                      />
                    </div>

                    {setupError && <p className="text-sm text-red-400">{setupError}</p>}

                    <div className="flex justify-end gap-3 pt-2">
                      <button onClick={handleClose} className="rounded-full border border-white/10 px-5 py-2 text-sm text-white transition hover:border-white/30">
                        Cancel
                      </button>
                      <button
                        onClick={handleStartDebate}
                        className="rounded-full bg-indigo-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
                      >
                        Start Debate ⚔️
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Running / Done Phase ── */}
                {(phase === "running" || phase === "done") && (
                  <div className="flex flex-col" style={{ maxHeight: "78vh" }}>
                    {/* Status bar */}
                    <div className="flex items-center justify-between border-b border-white/5 px-6 py-3">
                      <div className="flex items-center gap-3">
                        {phase === "running" && (
                          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                        {phase === "done" && (
                          <span className="flex h-2 w-2 rounded-full bg-amber-400" />
                        )}
                        <span className="text-sm text-slate-300">
                          {phase === "running"
                            ? streamingModel === "synthesis"
                              ? "Generating synthesis…"
                              : `Round ${currentRound} — ${streamingModel === "openai" ? "GPT" : streamingModel === "claude" ? "Claude" : "…"} arguing`
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
                          <span className="text-xs text-slate-400">
                            {latestConsensus.percentage}% / {targetConsensus}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Debate chat */}
                    <div
                      ref={debatePanelRef}
                      className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
                      style={{ minHeight: 0, maxHeight: "55vh" }}
                    >
                      {messages.map((msg) => {
                        if (msg.model === "synthesis") {
                          return (
                            <div key={msg.id} className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4">
                              <div className="mb-2 flex items-center gap-2">
                                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                                  ✨ Unified Synthesis
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                                {msg.content}
                                {msg.isStreaming && (
                                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-amber-400" />
                                )}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg.id}
                            className={`rounded-2xl border px-5 py-4 ${modelColor(msg.model)}`}
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${modelBadgeColor(msg.model)}`}>
                                  {modelLabel(msg.model)}
                                </span>
                                <span className="text-xs text-slate-500">Round {msg.round}</span>
                              </div>
                              {msg.isStreaming && (
                                <span className="flex h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: msg.model === "openai" ? "#34d399" : "#a78bfa" }} />
                              )}
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                              {msg.content}
                              {msg.isStreaming && (
                                <span
                                  className="ml-0.5 inline-block h-4 w-0.5 animate-pulse"
                                  style={{ backgroundColor: msg.model === "openai" ? "#34d399" : "#a78bfa" }}
                                />
                              )}
                            </p>
                          </div>
                        );
                      })}

                      {/* Consensus badges */}
                      {consensusHistory.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 px-2">
                          <div className="h-px flex-1 bg-white/5" />
                          <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${c.reached ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-slate-400"}`}>
                            {c.reached ? "✓" : "≈"} Round {c.round} consensus: {c.percentage}%
                            {c.reached ? " — Target reached!" : ""}
                          </span>
                          <div className="h-px flex-1 bg-white/5" />
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    {phase === "done" && (
                      <div className="border-t border-white/5 px-6 py-4 flex justify-end gap-3">
                        <button
                          onClick={handleReset}
                          className="rounded-full border border-white/10 px-5 py-2 text-sm text-white transition hover:border-white/30"
                        >
                          New Debate
                        </button>
                        <button
                          onClick={handleClose}
                          className="rounded-full bg-indigo-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Error Phase ── */}
                {phase === "error" && (
                  <div className="p-6 space-y-4">
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4">
                      <p className="text-sm text-red-300">⚠️ {errorMessage || "An error occurred during the debate."}</p>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button onClick={handleReset} className="rounded-full border border-white/10 px-5 py-2 text-sm text-white transition hover:border-white/30">
                        Try Again
                      </button>
                      <button onClick={handleClose} className="rounded-full bg-white/10 px-6 py-2 text-sm text-white hover:bg-white/15 transition">
                        Close
                      </button>
                    </div>
                  </div>
                )}

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
