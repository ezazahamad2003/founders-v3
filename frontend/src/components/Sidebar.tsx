"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ConversationSummary, UserProfile } from "@/lib/types";
import ConversationList from "./ConversationList";
import ProfileDrawer from "./ProfileDrawer";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  profile: UserProfile | null;
  onSignOut: () => void | Promise<void>;
  supabase: SupabaseClient;
}

export default function Sidebar({
  conversations,
  activeId,
  loading,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  profile,
  onSignOut,
  supabase,
}: SidebarProps) {
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col overflow-hidden border-r border-white/5 bg-[#0c0f1a]">
      <div className="border-b border-white/5 px-5 py-6">
        <div className="text-sm uppercase tracking-[0.3em] text-indigo-400">Scopic Legal</div>
        <button
          onClick={onNewConversation}
          className="mt-4 flex w-full items-center justify-center rounded-2xl bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          + New Chat
        </button>
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

      <div className="border-t border-white/5 px-4 py-4 text-sm text-slate-300">
        <button
          onClick={() => setProfileDrawerOpen(true)}
          className="w-full rounded-2xl border border-transparent px-3 py-2 text-left transition hover:border-white/10 hover:bg-white/5"
        >
          <p className="truncate font-semibold text-white">{profile?.email ?? "Anonymous"}</p>
          <p className="text-xs text-slate-400">Role: {profile?.role ?? "client"}</p>
          <p className="mt-1 text-xs text-indigo-300/70">Manage profile docs</p>
        </button>
        <button
          onClick={onSignOut}
          className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-xs uppercase tracking-wide text-slate-200 transition hover:border-white/40"
        >
          Sign out
        </button>
      </div>
      <ProfileDrawer
        open={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        profile={profile}
        supabase={supabase}
      />
    </aside>
  );
}

