"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConversationSummary } from "@/lib/types";
import ConversationList from "./ConversationList";
import DocumentReviewModal from "./DocumentReviewModal";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onStartDocumentReview: (file: File, clientRole: string, optionalPrompt: string) => Promise<void>;
  onStartAgenticDebate: () => void;
  onDeleteConversation: (conversationId: string) => void;
  externalTrigger?: boolean;
  onExternalTriggerHandled?: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  loading,
  onSelectConversation,
  onNewConversation,
  onStartDocumentReview,
  onStartAgenticDebate,
  onDeleteConversation,
  externalTrigger,
  onExternalTriggerHandled,
}: SidebarProps) {
  const router = useRouter();
  const [documentReviewModalOpen, setDocumentReviewModalOpen] = useState(false);

  // Handle external trigger to open document review modal
  useEffect(() => {
    if (externalTrigger) {
      setDocumentReviewModalOpen(true);
      onExternalTriggerHandled?.();
    }
  }, [externalTrigger, onExternalTriggerHandled]);

  return (
    <aside className="app-surface-3 app-border flex h-full w-[var(--sidebar-width)] flex-col overflow-hidden border-r">
      <div className="app-border border-b px-5 py-6">
        <div className="text-sm uppercase tracking-[0.3em] text-indigo-400">Scopic Legal</div>
        <div className="app-muted mt-1 text-xs">Private Beta Program</div>
        <button
          onClick={onNewConversation}
          className="app-surface-2 app-text app-border mt-4 flex w-full items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium transition hover:opacity-90"
        >
          + New Chat
        </button>
        <button
          onClick={() => setDocumentReviewModalOpen(true)}
          className="mt-3 flex w-full items-center justify-center rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20"
        >
          ⚖️ Document Review
        </button>
        <button
          onClick={onStartAgenticDebate}
          className="mt-3 flex w-full items-center justify-center rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20"
        >
          ⚔️ Agentic Debate
        </button>
        {/* Doc Generation button hidden until feature is ready for release */}
        {/* <button
          onClick={() => router.push("/document-generation")}
          className="mt-3 flex w-full items-center justify-center rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20"
        >
          ✨ Doc Generation
        </button> */}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          loading={loading}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={onDeleteConversation}
        />
      </div>

      <div className="app-border app-muted border-t px-5 py-4 text-sm">
        <button
          onClick={() => router.push("/document-vault")}
          className="app-surface-2 app-text app-border flex w-full items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium transition hover:opacity-90"
        >
          + Document Vault
        </button>
        <a
          href="https://calendar.app.google/z4aYNYvn748Br3ap8"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-medium uppercase tracking-wide text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20"
        >
          Book a Meeting
        </a>
      </div>
      <DocumentReviewModal
        open={documentReviewModalOpen}
        onClose={() => setDocumentReviewModalOpen(false)}
        onReview={onStartDocumentReview}
      />
    </aside>
  );
}

