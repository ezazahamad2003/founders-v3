"use client";

import clsx from "clsx";
import { ConversationSummary } from "@/lib/types";
import { WELCOME_CONVERSATION_ID } from "@/hooks/useChat";

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
            className="app-surface-2 h-12 w-full animate-pulse rounded-2xl"
          />
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return <p className="app-muted text-sm">No Legal Queries yet. Start a new Legal Query to begin.</p>;
  }

  return (
    <ul className="space-y-2">
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeId;
        const isWelcome = conversation.id === WELCOME_CONVERSATION_ID;
        return (
          <li key={conversation.id} className="relative">
            <button
              onClick={() => onSelectConversation(conversation.id)}
              className={clsx(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                isActive
                  ? "border-[color:var(--app-border-strong)] bg-[var(--app-surface-2)] text-[var(--app-text)]"
                  : "border-[color:var(--app-border)] bg-transparent text-[var(--app-text-muted)] hover:border-[color:var(--app-border-strong)] hover:bg-[var(--app-surface-2)]",
              )}
            >
              <div className={clsx("flex-1", !isWelcome && "pr-8")}>
                <p className="line-clamp-1 text-sm font-medium">
                  {conversation.title ?? "New chat"}
                </p>
                {!isWelcome && (
                  <p className="app-subtle mt-1 text-xs">
                    {new Date(conversation.updated_at).toLocaleString()}
                  </p>
                )}
              </div>
            </button>
            {!isWelcome && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  const confirmed = window.confirm("Delete this conversation?");
                  if (confirmed) {
                    onDeleteConversation(conversation.id);
                  }
                }}
                className="app-border app-muted absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border px-2 py-1 text-xs transition hover:border-red-400 hover:text-red-300"
                aria-label="Delete conversation"
              >
                ×
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

