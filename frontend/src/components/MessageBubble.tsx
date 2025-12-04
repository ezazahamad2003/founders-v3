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
    "rounded-3xl px-5 py-4 shadow-lg relative max-w-[760px]",
    isOwn
      ? "bg-indigo-600/80 text-white"
      : "w-full",
    !isOwn && (role === "assistant" ? "bg-[#16181f] text-slate-100" : "bg-white/10 text-slate-100"),
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
      {/* Show attachments ABOVE the message like ChatGPT */}
      {attachments.length > 0 && (
        <div className={clsx("flex flex-wrap gap-2", isOwn ? "justify-end" : "justify-start")}>
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-lg backdrop-blur"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">{file.original_name ?? "Document"}</span>
                <span className="text-xs text-slate-400">Document</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
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
      </div>
      {timestamp ? (
        <p className={clsx("text-xs text-slate-500", isOwn ? "text-right" : "text-left")}>
          {new Date(timestamp).toLocaleTimeString()}
        </p>
      ) : null}
    </div>
  );
}

