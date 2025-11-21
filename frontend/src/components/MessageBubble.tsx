"use client";

import { useState } from "react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileMeta } from "@/lib/types";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  isStreaming?: boolean;
  isOwn: boolean;
  attachments?: FileMeta[];
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  isStreaming,
  isOwn,
  attachments = [],
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const bubbleClass = clsx(
    "w-full max-w-[760px] rounded-3xl px-5 py-4 shadow-lg relative",
    isOwn
      ? "bg-indigo-600/80 text-white"
      : role === "assistant"
        ? "bg-[#16181f] text-slate-100"
        : "bg-white/10 text-slate-100",
  );

  const rowClass = clsx(
    "flex w-full",
    isOwn ? "justify-end" : "justify-start",
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy message", error);
    }
  };

  return (
    <div className="space-y-2">
      <div className={rowClass}>
        <div className={bubbleClass}>
        {role === "assistant" ? (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-4 top-3 text-xs text-slate-400 transition hover:text-white"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        ) : null}
        <div
          className={clsx(
            "prose prose-invert max-w-none text-[0.95rem] leading-7",
            isStreaming && "animate-pulse",
            "[&_p]:mb-5 [&_p:last-child]:mb-0",
            "[&_ul]:mb-5 [&_ol]:mb-5 [&_li]:leading-7",
            "[&_code]:rounded [&_code]:bg-black/40 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs",
            "[&_pre]:rounded-2xl [&_pre]:bg-black/60 [&_pre]:p-4 [&_pre]:text-xs",
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p>{children}</p>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
            }}
          >
            {content || "…"}
          </ReactMarkdown>
        </div>
      </div>
      {attachments.length ? (
        <div className={clsx("flex flex-wrap gap-2 text-xs text-slate-200", isOwn ? "justify-end" : "justify-start")}>
          {attachments.map((file) => (
            <span
              key={file.id}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-1"
            >
              📎 {file.original_name ?? "attachment"}
            </span>
          ))}
        </div>
      ) : null}
      </div>
      {timestamp ? (
        <p className={clsx("text-xs text-slate-500", isOwn ? "text-right" : "text-left")}>
          {new Date(timestamp).toLocaleTimeString()}
        </p>
      ) : null}
    </div>
  );
}

