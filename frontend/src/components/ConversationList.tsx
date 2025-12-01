"use client";

import clsx from "clsx";
import { ConversationSummary } from "@/lib/types";

interface ConversationListProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
}

export default function ConversationList({
  conversations,
  activeId,
  loading,
  onSelectConversation,
  onDeleteConversation,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-12 w-full animate-pulse rounded-2xl bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return <p className="text-sm text-slate-400">No Legal Queries yet. Start a new Legal Query to begin.</p>;
  }

  return (
    <ul className="space-y-2">
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeId;
        return (
          <li key={conversation.id} className="relative">
            <button
              onClick={() => onSelectConversation(conversation.id)}
              className={clsx(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                isActive
                  ? "border-white/50 bg-white/10 text-white"
                  : "border-white/5 bg-white/0 text-slate-200 hover:border-white/20 hover:bg-white/5",
              )}
            >
              <div className="flex-1 pr-8">
                <p className="line-clamp-1 text-sm font-medium">
                  {conversation.title ?? "New chat"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(conversation.updated_at).toLocaleString()}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                const confirmed = window.confirm("Delete this conversation?");
                if (confirmed) {
                  onDeleteConversation(conversation.id);
                }
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:border-red-400 hover:text-red-300"
              aria-label="Delete conversation"
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}

