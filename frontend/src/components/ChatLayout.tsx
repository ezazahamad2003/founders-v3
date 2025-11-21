"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useChat } from "@/hooks/useChat";
import Sidebar from "./Sidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import TosModal from "./TosModal";
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
    activeConversation,
    activeConversationId,
    messages,
    loadConversation,
    startNewConversation,
    sendMessage,
    mode,
    setMode,
    isStreaming,
    streamedAssistantText,
    conversationFiles,
    filesById,
    registerFilesForConversation,
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
        onSignOut={onSignOut}
        supabase={supabase}
      />
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <MessageList
          messages={messages}
          streamingMessage={streamedAssistantText}
          isStreaming={isStreaming}
          profileId={profile?.id}
          filesById={filesById}
          errorMessage={errorMessage}
        />

        <ChatInput
          disabled={isProfileLoading || requiresTos}
          mode={mode}
          onModeChange={setMode}
          onSend={handleSendMessage}
          isStreaming={isStreaming}
          conversationId={activeConversationId}
          supabase={supabase}
          profileId={profile?.id ?? null}
          registerFiles={registerFilesForConversation}
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

