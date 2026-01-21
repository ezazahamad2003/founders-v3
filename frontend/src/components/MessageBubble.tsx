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
    "rounded-3xl px-6 py-5 shadow-lg relative max-w-[760px]",
    isOwn
      ? "bg-indigo-600/80 text-white"
      : "w-full",
    !isOwn && (role === "assistant" ? "bg-[#1a1c24] text-slate-100" : "bg-white/10 text-slate-100"),
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
            "prose prose-invert max-w-none text-[15px] leading-[1.7]",
            isStreaming && "animate-pulse",
            // Paragraphs
            "[&_p]:mb-4 [&_p:last-child]:mb-0 [&_p]:leading-[1.7]",
            // Headers
            "[&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mb-4 [&_h1]:mt-6",
            "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5",
            "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4",
            // Lists - improved spacing and styling
            "[&_ul]:mb-4 [&_ul]:mt-2 [&_ul]:space-y-1.5",
            "[&_ol]:mb-4 [&_ol]:mt-2 [&_ol]:space-y-1.5",
            "[&_li]:leading-[1.7] [&_li]:pl-1",
            "[&_ul>li]:relative [&_ul>li]:pl-2",
            // Nested lists
            "[&_li>ul]:mt-1.5 [&_li>ol]:mt-1.5",
            "[&_li>ul]:mb-1.5 [&_li>ol]:mb-1.5",
            // Inline code
            "[&_code]:rounded [&_code]:bg-black/50 [&_code]:px-1.5 [&_code]:py-0.5",
            "[&_code]:text-[13px] [&_code]:font-mono [&_code]:text-blue-300",
            "[&_code]:border [&_code]:border-white/10",
            // Code blocks
            "[&_pre]:rounded-xl [&_pre]:bg-[#0d1117] [&_pre]:border [&_pre]:border-white/10",
            "[&_pre]:p-4 [&_pre]:my-4 [&_pre]:overflow-x-auto",
            "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[13px]",
            "[&_pre_code]:border-0 [&_pre_code]:text-slate-200",
            // Bold and emphasis
            "[&_strong]:font-semibold [&_strong]:text-white",
            "[&_em]:italic [&_em]:text-slate-200",
            // Links
            "[&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2",
            "[&_a:hover]:text-blue-300",
            // Blockquotes
            "[&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500/50",
            "[&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-300",
            "[&_blockquote]:my-4",
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p>{children}</p>,
              li: ({ children }) => <li>{children}</li>,
              strong: ({ children }) => <strong>{children}</strong>,
              h1: ({ children }) => <h1>{children}</h1>,
              h2: ({ children }) => <h2>{children}</h2>,
              h3: ({ children }) => <h3>{children}</h3>,
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

