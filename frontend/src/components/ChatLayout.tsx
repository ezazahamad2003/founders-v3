"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useChat } from "@/hooks/useChat";
import Sidebar from "./Sidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import TosModal from "./TosModal";
import ProfileMenu from "./ProfileMenu";
import AgenticDebateChat from "./AgenticDebateChat";
import type { FileMeta } from "@/lib/types";

interface ChatLayoutProps {
  accessToken: string;
  supabase: SupabaseClient;
  onSignOut: () => void | Promise<void>;
}

export default function ChatLayout({ accessToken, supabase, onSignOut }: ChatLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [triggerDocumentReview, setTriggerDocumentReview] = useState(false);
  const [showAgenticDebate, setShowAgenticDebate] = useState(false);
  
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
    startContractReview,
    sendMessage,
    mode,
    setMode,
    promptMode,
    setPromptMode,
    isStreaming,
    streamedAssistantText,
    filesById,
    uploadFile,
    pendingAttachmentIds,
    setPendingAttachmentIds,
    errorMessage,
    clearError,
    deleteConversation,
    showScopicIntro,
    scopicIntroMarkdown,
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

  const handleStartDocumentReview = async (file: File, clientRole: string, optionalPrompt: string) => {
    // Start a new conversation in contract review mode
    startContractReview();
    
    // Upload the file
    const uploadedFile = await uploadFile(file, null);
    
    // Add to pending attachments
    setPendingAttachments([uploadedFile]);
    setPendingAttachmentIds([uploadedFile.id]);
    
    // Construct the review message
    let reviewMessage = `I am a ${clientRole}. Please review the attached document.`;
    
    if (optionalPrompt) {
      reviewMessage += `\n\n${optionalPrompt}`;
    }
    
    // Send the message with the file, explicitly setting contract_review mode
    // conversationIdOverride: null forces a new conversation even if activeConversationId
    // is stale in the closure (React batches state updates from startContractReview)
    await sendMessage({ 
      text: reviewMessage, 
      fileIds: [uploadedFile.id],
      promptModeOverride: "contract_review",
      conversationIdOverride: null,
    });
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
      <div className="app-bg app-text flex h-screen overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile by default, slides in when open */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          conversations={conversations}
          activeId={activeConversationId}
          loading={conversationsLoading || isProfileLoading}
          onSelectConversation={(id) => {
            setShowAgenticDebate(false);
            loadConversation(id);
            setIsSidebarOpen(false); // Close sidebar on mobile after selection
          }}
          onNewConversation={() => {
            setShowAgenticDebate(false);
            startNewConversation();
            setIsSidebarOpen(false);
          }}
          onStartDocumentReview={async (file, clientRole, optionalPrompt) => {
            setShowAgenticDebate(false);
            await handleStartDocumentReview(file, clientRole, optionalPrompt);
            setIsSidebarOpen(false);
            setTriggerDocumentReview(false);
          }}
          onStartAgenticDebate={() => {
            setShowAgenticDebate(true);
            setIsSidebarOpen(false);
          }}
          onDeleteConversation={deleteConversation}
          profile={profile}
          supabase={supabase}
          externalTrigger={triggerDocumentReview}
          onExternalTriggerHandled={() => setTriggerDocumentReview(false)}
        />
      </div>

      {/* Main chat area with proper flex structure */}
      <div className="flex h-full w-full min-h-0 flex-1 flex-col">
        {/* Header - fixed height */}
        <div className="app-bg app-border flex h-16 shrink-0 items-center justify-end border-b px-4 sm:px-6">
          {/* Hamburger Menu Button - Only visible on mobile, positioned absolutely on left */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-white/5 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <svg className="h-6 w-6 app-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Profile Menu - always in right corner */}
          <ProfileMenu profile={profile} onSignOut={onSignOut} />
        </div>
        
        {showAgenticDebate ? (
          <AgenticDebateChat
            accessToken={accessToken}
            onBackToChat={() => setShowAgenticDebate(false)}
          />
        ) : (
          <>
            {/* Message area - flex-1 to fill available space, overflow-y-auto for scrolling */}
            <MessageList
              messages={messages}
              streamingMessage={streamedAssistantText}
              isStreaming={isStreaming}
              profileId={profile?.id}
              filesById={allFilesById}
              errorMessage={errorMessage}
              onDismissError={clearError}
              showIntro={showScopicIntro && !activeConversationId && messages.length === 0}
              introMarkdown={scopicIntroMarkdown}
              onStartDocumentReview={() => setTriggerDocumentReview(true)}
              onSendMessage={handleSendMessage}
            />

            {/* Input area - fixed at bottom, shrink-0 prevents squishing */}
            <ChatInput
              disabled={isProfileLoading || requiresTos || activeConversationId === "welcome-onboarding"}
              mode={mode}
              onModeChange={setMode}
              promptMode={promptMode}
              onPromptModeChange={setPromptMode}
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
          </>
        )}
      </div>

      <TosModal
        open={requiresTos}
        onAccept={acceptTos}
        onDecline={() => supabase.auth.signOut()}
      />
    </div>
  );
}

