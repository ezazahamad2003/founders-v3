"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { ConversationSummary, UserProfile } from "@/lib/types";
import ConversationList from "./ConversationList";
import ProfileDrawer from "./ProfileDrawer";
import DocumentReviewModal from "./DocumentReviewModal";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onStartDocumentReview: (file: File, clientRole: string, optionalPrompt: string) => Promise<void>;
  onDeleteConversation: (conversationId: string) => void;
  profile: UserProfile | null;
  supabase: SupabaseClient;
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
  onDeleteConversation,
  profile,
  supabase,
  externalTrigger,
  onExternalTriggerHandled,
}: SidebarProps) {
  const router = useRouter();
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [documentReviewModalOpen, setDocumentReviewModalOpen] = useState(false);

  // Handle external trigger to open document review modal
  useEffect(() => {
    if (externalTrigger) {
      setDocumentReviewModalOpen(true);
      onExternalTriggerHandled?.();
    }
  }, [externalTrigger, onExternalTriggerHandled]);

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col overflow-hidden border-r border-white/5 bg-[#0c0f1a]">
      <div className="border-b border-white/5 px-5 py-6">
        <div className="text-sm uppercase tracking-[0.3em] text-indigo-400">Scopic Legal</div>
        <div className="mt-1 text-xs text-slate-400">Private Beta Program</div>
        <button
          onClick={onNewConversation}
          className="mt-4 flex w-full items-center justify-center rounded-2xl bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          + New Chat
        </button>
        <button
          onClick={() => setDocumentReviewModalOpen(true)}
          className="mt-3 flex w-full items-center justify-center rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20"
        >
          ⚖️ Document Review
        </button>
        {/* Blind Spot Analysis - Hidden until requirements finalized */}
        {/* <button
          onClick={() => router.push("/blind-spot-analysis")}
          className="mt-3 flex w-full items-center justify-center rounded-2xl bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Blind Spot Analysis
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

      <div className="border-t border-white/5 px-5 py-4 text-sm text-slate-300">
        <button
          onClick={() => setProfileDrawerOpen(true)}
          className="flex w-full items-center justify-center rounded-2xl bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          + Document Vault
        </button>
        <a
          href="https://calendar.google.com/calendar/u/0/appointments/AcZssZ0Kntrw_2jzyJwypoDvkeY1nCAaNdy6XUsKB4A="
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-medium uppercase tracking-wide text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20"
        >
          Book a Meeting
        </a>
      </div>
      <ProfileDrawer
        open={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        profile={profile}
        supabase={supabase}
      />
      <DocumentReviewModal
        open={documentReviewModalOpen}
        onClose={() => setDocumentReviewModalOpen(false)}
        onReview={onStartDocumentReview}
      />
    </aside>
  );
}

