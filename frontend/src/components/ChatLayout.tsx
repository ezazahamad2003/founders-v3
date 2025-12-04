"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useChat } from "@/hooks/useChat";
import Sidebar from "./Sidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import TosModal from "./TosModal";
import ProfileMenu from "./ProfileMenu";
import type { FileMeta } from "@/lib/types";

interface ChatLayoutProps {
  accessToken: string;
  supabase: SupabaseClient;
  onSignOut: () => void | Promise<void>;
}

export default function ChatLayout({ accessToken, supabase, onSignOut }: ChatLayoutProps) {
  const {
    profile,
    isProfileLoading,
    requiresTos,
    acceptTos,
    conversations,
    conversationsLoading,
    activeConversationId,
    messages,
    loadConversation,
    startNewConversation,
    sendMessage,
    mode,
    setMode,
    isStreaming,
    streamedAssistantText,
    filesById,
    registerFilesForConversation,
    uploadFile,
    pendingAttachmentIds,
    setPendingAttachmentIds,
    errorMessage,
    deleteConversation,
  } = useChat(accessToken);

  const [pendingAttachments, setPendingAttachments] = useState<FileMeta[]>([]);

  const pendingAttachmentFiles = useMemo(
    () => pendingAttachments.filter((file) => pendingAttachmentIds.includes(file.id)),
    [pendingAttachments, pendingAttachmentIds],
  );

  // Merge filesById with pending attachments so they show in messages
  const allFilesById = useMemo(() => {
    const merged = { ...filesById };
    pendingAttachments.forEach((file) => {
      merged[file.id] = file;
    });
    return merged;
  }, [filesById, pendingAttachments]);

  const handleFilesRegistered = (files: FileMeta[]) => {
    setPendingAttachments((prev) => [...prev, ...files]);
    setPendingAttachmentIds((prev) => [...prev, ...files.map((file) => file.id)]);
  };

  const handleRemoveAttachment = (fileId: string) => {
    setPendingAttachmentIds((prev) => prev.filter((id) => id !== fileId));
  };

  const handleSendMessage = async (text: string) => {
    const fileIds = pendingAttachmentIds;
    await sendMessage({ text, fileIds });
    setPendingAttachmentIds([]);
    // Don't clear pendingAttachments immediately - keep them for display
  };

  if (isProfileLoading && !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#05060c] text-slate-300">
        Loading your workspace…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#05060c] text-slate-100">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        loading={conversationsLoading || isProfileLoading}
        onSelectConversation={loadConversation}
        onNewConversation={startNewConversation}
        onDeleteConversation={deleteConversation}
        profile={profile}
        supabase={supabase}
      />
      {/* Main chat area with proper flex structure */}
      <div className="flex h-screen w-full flex-1 flex-col">
        {/* Header - fixed height */}
        <div className="flex h-16 shrink-0 items-center justify-end border-b border-white/5 bg-[#05060c] px-6">
          <ProfileMenu profile={profile} onSignOut={onSignOut} />
        </div>
        
        {/* Message area - flex-1 to fill available space, overflow-y-auto for scrolling */}
        <MessageList
          messages={messages}
          streamingMessage={streamedAssistantText}
          isStreaming={isStreaming}
          profileId={profile?.id}
          filesById={allFilesById}
          errorMessage={errorMessage}
        />

        {/* Input area - fixed at bottom, shrink-0 prevents squishing */}
        <ChatInput
          disabled={isProfileLoading || requiresTos}
          mode={mode}
          onModeChange={setMode}
          onSend={handleSendMessage}
          isStreaming={isStreaming}
          conversationId={activeConversationId}
          supabase={supabase}
          profileId={profile?.id ?? null}
          accessToken={accessToken}
          uploadFile={uploadFile}
          onFilesRegistered={handleFilesRegistered}
          pendingAttachments={pendingAttachmentFiles}
          onRemoveAttachment={handleRemoveAttachment}
        />
      </div>

      <TosModal
        open={requiresTos}
        onAccept={acceptTos}
      />
    </div>
  );
}

