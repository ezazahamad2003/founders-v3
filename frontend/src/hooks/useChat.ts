"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChatMode,
  ConversationSummary,
  FileMeta,
  Message,
  PromptMode,
  RegisterFileInput,
  UserProfile,
} from "@/lib/types";
import {
  acceptTos,
  deleteConversation as deleteConversationApi,
  getConversation,
  getMe,
  listConversations,
  registerConversationFiles,
  streamChat,
  uploadFile as uploadFileApi,
} from "@/lib/api";

const emptyMessages: Message[] = [];

const getIntroSeenKey = (userId: string) => `scopic_intro_seen:${userId}`;
const getWelcomeFirstVisitKey = (userId: string) => `scopic_welcome_first_visit:${userId}`;

export const WELCOME_CONVERSATION_ID = "welcome-onboarding";

const WELCOME_MESSAGE_CONTENT = `## Welcome to Scopic Legal! 🎉

Thanks for joining our private beta program. We designed this tool to explore your experience with "self-serving" legal work and to identify where you need the most help.

### 📹 Watch this quick intro video to get started:

<div style="position: relative; padding-bottom: 56.25%; height: 0; width: 100%; max-width: 100%; margin: 20px 0;"><iframe src="https://www.loom.com/embed/f1696ad77b9b47c2a7d76b747b505cd7?sid=e6b0c4b3-6f8c-4f3a-b8e5-8f5e5e5e5e5e" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>

### How to get started:

- **Ask Away:** Type any legal question in a "+New Chat" or use the buttons below for common use cases.
- **Document Review:** Click "⚖️ Document Review" to upload and analyze contracts.
- **Meet Us:** Book a free legal/fundraising strategy consultation with our CEO, Amit Bhanot (10+ years Corporate Lawyer & VC Partner) by clicking "+Book a Meeting".
- **Provide Context:** Click "+Document Vault" to upload past or future agreements, so we'll be ready to help you. Any data or documents that you upload will be kept confidential pursuant to our Privacy Policy.

We're thrilled to have you onboard and your feedback is crucial to shaping Scopic Legal. Let's get to work!

**Important Note:** Scopic Legal is an AI assistant, not a law firm. The responses are for informational purposes only and do not constitute legal advice. Please ensure critical documents are reviewed by a qualified professional, whom we can connect you with if needed.
`;

const SCOPIC_INTRO_MARKDOWN = `## Scopic Intro

Welcome to Scopic Legal! Thanks for joining our private beta program. We designed this tool to explore your experience with "self-serving" legal work and to identify where you need the most help.

### How to get started:

- **Ask Away:** Type any legal question in a "+New Legal Query" or use the \\[prompts\\] in the sidebar for common use cases.
- **Meet Us:** Book a free legal/fundraising strategy consultation with our CEO, Amit Bhanot (10+ years Corporate Lawyer & VC Partner) by clicking "+Book a Meeting".
- **Provide Context:** To get the most out of that meeting, click "+Document Vault" to upload past or future agreements, so we'll be ready to help you. Any data or documents that you upload will be kept confidential pursuant to our Privacy Policy.

We're thrilled to have you onboard and your feedback is crucial to shaping Scopic Legal. Let's get to work!

**Important Note:** Scopic Legal is an AI assistant, not a law firm. The responses are for informational purposes only and do not constitute legal advice. Please ensure critical documents are reviewed by a qualified professional, whom we can connect you with if needed.
`;

// Create a static welcome conversation with the video
const createWelcomeConversation = (): ConversationSummary => ({
  id: WELCOME_CONVERSATION_ID,
  title: "👋 Welcome to Scopic Legal",
  created_at: new Date(0).toISOString(), // Set to epoch to always be first
  updated_at: new Date(0).toISOString(),
  assigned_lawyer_id: null,
});

const createWelcomeMessage = (): Message => ({
  id: "welcome-message-1",
  conversation_id: WELCOME_CONVERSATION_ID,
  user_id: null,
  role: "assistant",
  content: WELCOME_MESSAGE_CONTENT,
  model: null,
  metadata: null,
  created_at: new Date(0).toISOString(),
});

export function useChat(accessToken: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [requiresTos, setRequiresTos] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(emptyMessages);
  const [conversationFiles, setConversationFiles] = useState<FileMeta[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedAssistantText, setStreamedAssistantText] = useState("");
  const streamedTextRef = useRef(""); // Track streamed text for onDone callback
  const [mode, setMode] = useState<ChatMode>("auto");
  const [promptMode, setPromptMode] = useState<PromptMode>("general");
  const [conversationPromptModes, setConversationPromptModes] = useState<Record<string, PromptMode>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAttachmentIds, setPendingAttachmentIds] = useState<string[]>([]);
  const [showScopicIntro, setShowScopicIntro] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  const tokenReady = Boolean(accessToken);

  const resetConversationState = useCallback(() => {
    setActiveConversationId(null);
    setMessages(emptyMessages);
    setConversationFiles([]);
    setPendingAttachmentIds([]);
    setStreamedAssistantText("");
    setPromptMode("general"); // Reset to general mode for new conversations
  }, []);

  const refreshConversations = useCallback(() => {
    if (!tokenReady) return;
    setConversationsLoading(true);
    listConversations(accessToken!)
      .then((res) => {
        // Always prepend welcome conversation at the top for all users
        const welcomeConversation = createWelcomeConversation();
        setConversations([welcomeConversation, ...res.conversations]);
      })
      .catch((error) => setErrorMessage(error.message || "Unable to load conversations."))
      .finally(() => setConversationsLoading(false));
  }, [accessToken, tokenReady]);

  const loadConversation = useCallback(
    (conversationId: string) => {
      if (!tokenReady || !conversationId) return;
      setShowScopicIntro(false);
      
      // Handle special welcome conversation
      if (conversationId === WELCOME_CONVERSATION_ID) {
        setActiveConversationId(conversationId);
        setMessages([createWelcomeMessage()]);
        setConversationFiles([]);
        setPendingAttachmentIds([]);
        setStreamedAssistantText("");
        setPromptMode("general");
        // Welcome conversation stays in sidebar permanently - no removal
        return;
      }
      
      getConversation(accessToken!, conversationId)
        .then((data) => {
          setActiveConversationId(conversationId);
          setMessages(data.messages);
          setConversationFiles(data.files);
          setPendingAttachmentIds([]);
          setStreamedAssistantText("");
          
          // Restore prompt mode from tracked modes or default to general
          const savedMode = conversationPromptModes[conversationId] || "general";
          setPromptMode(savedMode);
        })
        .catch((error) => setErrorMessage(error.message || "Unable to load conversation."));
    },
    [accessToken, tokenReady, conversationPromptModes],
  );

  useEffect(() => {
    if (!tokenReady) {
      setProfile(null);
      setIsProfileLoading(false);
      resetConversationState();
      return;
    }

    setIsProfileLoading(true);
    getMe(accessToken!)
      .then((me) => {
        setProfile(me);
        const needsTos = !me.accepted_tos_at;
        setRequiresTos(needsTos);
        setShowScopicIntro(false);
        
        // Check if this is the user's first visit
        const userId = me.id;
        const firstVisitKey = getWelcomeFirstVisitKey(userId);
        const hasVisitedBefore = typeof window !== "undefined" && window.localStorage.getItem(firstVisitKey) === "true";
        setIsFirstVisit(!hasVisitedBefore);
        
        // Mark as visited
        if (!hasVisitedBefore && typeof window !== "undefined") {
          window.localStorage.setItem(firstVisitKey, "true");
        }
        
        if (!needsTos) {
          refreshConversations();
        } else {
          resetConversationState();
        }
      })
      .catch((error) => {
        setErrorMessage(error.message || "Failed to load profile.");
      })
      .finally(() => {
        setIsProfileLoading(false);
      });
  }, [accessToken, tokenReady, resetConversationState, refreshConversations]);

  // Auto-load welcome conversation ONLY on first visit
  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId && !isProfileLoading && isFirstVisit) {
      loadConversation(WELCOME_CONVERSATION_ID);
      setIsFirstVisit(false); // Only auto-load once
    }
  }, [conversations.length, activeConversationId, isProfileLoading, isFirstVisit, loadConversation]);

  const startNewConversation = useCallback(() => {
    setShowScopicIntro(false);
    resetConversationState();
    // Welcome conversation stays in sidebar - don't remove it
  }, [resetConversationState]);

  const startContractReview = useCallback(() => {
    setShowScopicIntro(false);
    resetConversationState();
    setPromptMode("contract_review");
  }, [resetConversationState]);

  const changePromptMode = useCallback((newMode: PromptMode) => {
    setPromptMode(newMode);
    // Track mode for current conversation if one is active
    if (activeConversationId) {
      setConversationPromptModes(prev => ({
        ...prev,
        [activeConversationId]: newMode
      }));
    }
  }, [activeConversationId]);

  const handleAcceptTos = useCallback(async () => {
    if (!tokenReady) return;
    try {
      const updated = await acceptTos(accessToken!);
      setProfile(updated);
      setRequiresTos(false);
      refreshConversations();

      // Frontend-only one-time intro: show immediately after first Terms acceptance in this browser
      // (We key by user id so multi-user testing doesn't conflict.)
      const userId = updated.id;
      const key = getIntroSeenKey(userId);
      const alreadySeen = typeof window !== "undefined" && window.localStorage.getItem(key) === "true";
      if (!alreadySeen) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, "true");
        }
        setShowScopicIntro(true);
      }
    } catch (error) {
      setErrorMessage((error as Error).message || "Failed to accept terms.");
    }
  }, [accessToken, tokenReady, refreshConversations]);

  const registerFilesForConversation = useCallback(
    async (conversationId: string | null, files: RegisterFileInput[]) => {
      if (!tokenReady) throw new Error("Missing auth token");
      const response = await registerConversationFiles(accessToken!, conversationId, files);
      setConversationFiles((prev) => [...response.files, ...prev]);
      return response.files;
    },
    [accessToken, tokenReady],
  );

  const uploadFile = useCallback(
    async (file: File, conversationId: string | null) => {
      if (!tokenReady) throw new Error("Missing auth token");
      const fileMeta = await uploadFileApi(accessToken!, file, conversationId);
      return fileMeta;
    },
    [accessToken, tokenReady],
  );

  const sendMessage = useCallback(
    async (options: { text: string; modeOverride?: ChatMode; promptModeOverride?: PromptMode; fileIds?: string[]; conversationIdOverride?: string | null }) => {
      if (!tokenReady || !profile) return;
      const trimmed = options.text.trim();
      if (!trimmed) return;

      // Once a user starts a real query, hide the intro (if it was shown).
      setShowScopicIntro(false);

      const fileIds = options.fileIds ?? [];
      const conversationId = options.conversationIdOverride !== undefined
        ? options.conversationIdOverride
        : activeConversationId;
      const tempMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId ?? "pending",
        user_id: profile.id,
        role: "user",
        content: trimmed,
        model: null,
        metadata: { input_files: fileIds },
        created_at: new Date().toISOString(),
      };

      if (options.conversationIdOverride === null) {
        setMessages([tempMessage]);
      } else {
        setMessages((prev) => [...prev, tempMessage]);
      }
      setStreamedAssistantText("");
      streamedTextRef.current = ""; // Reset ref
      setIsStreaming(true);
      setErrorMessage(null);

      const effectivePromptMode = options.promptModeOverride ?? promptMode;

      try {
        await streamChat(
          accessToken!,
          {
            conversation_id: conversationId,
            message: trimmed,
            file_ids: fileIds.length ? fileIds : null,
            mode: options.modeOverride ?? mode,
            prompt_mode: effectivePromptMode, // Use override if provided
          },
          {
            onToken: (delta) => {
              const newText = delta ?? "";
              streamedTextRef.current += newText; // Update ref
              setStreamedAssistantText((prev) => prev + newText);
            },
            onDone: async (payload) => {
              setIsStreaming(false);
              
              // Use the local conversationId (respects conversationIdOverride)
              // instead of activeConversationId which may be stale in this closure
              const isNewConversation = !conversationId && payload.conversation_id;
              if (isNewConversation) {
                setActiveConversationId(payload.conversation_id);
                // Track prompt mode for this new conversation (use effective mode)
                setConversationPromptModes(prev => ({
                  ...prev,
                  [payload.conversation_id]: effectivePromptMode
                }));
                
                // Update temp user message with real conversation ID
                setMessages((prev) => prev.map(msg => 
                  msg.conversation_id === "pending" 
                    ? { ...msg, conversation_id: payload.conversation_id }
                    : msg
                ));
              }
              
              // Add the completed assistant message to the messages list
              const assistantMessage: Message = {
                id: payload.message_id ?? crypto.randomUUID(),
                conversation_id: payload.conversation_id,
                user_id: null,
                role: "assistant",
                content: streamedTextRef.current, // Use ref to get complete text
                model: null,
                metadata: null,
                created_at: new Date().toISOString(),
              };
              
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamedAssistantText("");
              streamedTextRef.current = ""; // Reset ref
              setPendingAttachmentIds([]);
              
              // Update conversation list optimistically without full refresh
              setConversations((prev) => {
                const now = new Date().toISOString();
                const conversationId = payload.conversation_id;
                
                // Find existing conversation
                const existingIndex = prev.findIndex((c) => c.id === conversationId);
                
                if (existingIndex >= 0) {
                  // Update existing conversation - move to top with new timestamp
                  const updated = [...prev];
                  const existing = updated[existingIndex];
                  updated.splice(existingIndex, 1); // Remove from current position
                  updated.unshift({
                    ...existing,
                    updated_at: now,
                    title: existing.title || trimmed.slice(0, 50), // Use first message as title if empty
                  });
                  return updated;
                } else if (isNewConversation) {
                  // Add new conversation at the top
                  return [
                    {
                      id: conversationId,
                      title: trimmed.slice(0, 50),
                      created_at: now,
                      updated_at: now,
                      assigned_lawyer_id: null,
                    },
                    ...prev,
                  ];
                }
                
                return prev;
              });
            },
            onError: (error) => {
              setIsStreaming(false);
              setErrorMessage(error.message);
            },
          },
        );
      } catch (error) {
        setIsStreaming(false);
        setErrorMessage((error as Error).message);
      }
    },
    [
      accessToken,
      activeConversationId,
      mode,
      promptMode,
      profile,
      tokenReady,
    ],
  );

  const filesById = useMemo(() => {
    return conversationFiles.reduce<Record<string, FileMeta>>((acc, file) => {
      acc[file.id] = file;
      return acc;
    }, {});
  }, [conversationFiles]);

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!tokenReady) return;
      
      // Prevent deletion of the welcome conversation
      if (conversationId === WELCOME_CONVERSATION_ID) {
        return;
      }
      
      try {
        await deleteConversationApi(accessToken!, conversationId);
        setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId));
        if (activeConversationId === conversationId) {
          startNewConversation();
        }
        refreshConversations();
      } catch (error) {
        setErrorMessage((error as Error).message || "Unable to delete conversation.");
      }
    },
    [accessToken, activeConversationId, refreshConversations, startNewConversation, tokenReady],
  );

  return {
    profile,
    isProfileLoading,
    requiresTos,
    conversations,
    conversationsLoading,
    activeConversationId,
    messages,
    conversationFiles,
    filesById,
    pendingAttachmentIds,
    setPendingAttachmentIds,
    isStreaming,
    streamedAssistantText,
    mode,
    setMode,
    promptMode,
    setPromptMode: changePromptMode,
    errorMessage,
    showScopicIntro,
    scopicIntroMarkdown: SCOPIC_INTRO_MARKDOWN,
    refreshConversations,
    loadConversation,
    startNewConversation,
    startContractReview,
    acceptTos: handleAcceptTos,
    registerFilesForConversation,
    uploadFile,
    sendMessage,
    deleteConversation,
  };
}

