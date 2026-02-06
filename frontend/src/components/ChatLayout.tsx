"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import Sidebar from "./Sidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import TosModal from "./TosModal";
import ProfileMenu from "./ProfileMenu";
import type { FileMeta } from "@/lib/types";
import DocumentGenerationView from "./DocumentGenerationView";

interface ChatLayoutProps {
  accessToken: string;
  supabase: SupabaseClient;
  onSignOut: () => void | Promise<void>;
}

export default function ChatLayout({ accessToken, supabase, onSignOut }: ChatLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [triggerDocumentReview, setTriggerDocumentReview] = useState(false);
  const isDocumentGeneration = pathname === "/document-generation";
  
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
    registerFilesForConversation,
    uploadFile,
    pendingAttachmentIds,
    setPendingAttachmentIds,
    errorMessage,
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
    await sendMessage({ 
      text: reviewMessage, 
      fileIds: [uploadedFile.id],
      promptModeOverride: "contract_review" 
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
    <div className="flex h-screen overflow-hidden bg-[#05060c] text-slate-100">
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
            loadConversation(id);
            setIsSidebarOpen(false); // Close sidebar on mobile after selection
          }}
          onNewConversation={() => {
            startNewConversation();
            setIsSidebarOpen(false);
          }}
          onStartDocumentReview={async (file, clientRole, optionalPrompt) => {
            await handleStartDocumentReview(file, clientRole, optionalPrompt);
            setIsSidebarOpen(false);
            setTriggerDocumentReview(false);
          }}
          onDeleteConversation={deleteConversation}
          profile={profile}
          supabase={supabase}
          externalTrigger={triggerDocumentReview}
          onExternalTriggerHandled={() => setTriggerDocumentReview(false)}
          onNavigate={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main chat area with proper flex structure */}
      <div className="flex h-screen w-full flex-1 flex-col">
        {/* Header - fixed height */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-white/5 bg-[#05060c] px-4 sm:px-6 ${
            isDocumentGeneration ? "justify-between" : "justify-end"
          }`}
        >
          {/* Hamburger Menu Button - Only visible on mobile, positioned absolutely on left */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute left-4 flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/5 transition lg:hidden"
            aria-label="Toggle sidebar"
          >
            <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {isDocumentGeneration && (
            <button
              onClick={() => router.push("/")}
              className="hidden rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:inline-flex"
            >
              ← Back to Chat
            </button>
          )}

          {/* Profile Menu - always in right corner */}
          <ProfileMenu profile={profile} onSignOut={onSignOut} />
        </div>
        
        {isDocumentGeneration ? (
          <DocumentGenerationView />
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
      />
    </div>
  );
}

