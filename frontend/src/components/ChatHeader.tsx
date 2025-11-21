"use client";

import { ConversationDetail } from "@/lib/types";

interface ChatHeaderProps {
  conversation: ConversationDetail | null;
  filesCount: number;
}

export default function ChatHeader({ conversation, filesCount }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-white/5 bg-[#05060c]/70 px-8 py-5 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Current conversation</p>
        <h1 className="text-2xl font-semibold text-white">
          {conversation?.title ?? "New chat"}
        </h1>
        <p className="text-xs text-slate-500">
          {conversation
            ? `Last updated ${new Date(conversation.updated_at).toLocaleString()}`
            : "Ask anything about contracts, compliance, or research."}
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 px-4 py-2 text-xs text-slate-300">
        Files in chat: <span className="font-semibold text-white">{filesCount}</span>
      </div>
    </header>
  );
}

