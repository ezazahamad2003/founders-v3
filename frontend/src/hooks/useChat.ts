"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChatMode,
  ConversationSummary,
  FileMeta,
  Message,
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

const SCOPIC_INTRO_MARKDOWN = `## Scopic Intro

Welcome to Scopic Legal! Thanks for joining our private beta program. We designed this tool to explore your experience with "self-serving" legal work and to identify where you need the most help.

### How to get started:

- **Ask Away:** Type any legal question in a "+New Legal Query" or use the \\[prompts\\] in the sidebar for common use cases.
- **Meet Us:** Book a free legal/fundraising strategy consultation with our CEO, Amit Bhanot (10+ years Corporate Lawyer & VC Partner) by clicking "+Book a Meeting".
- **Provide Context:** To get the most out of that meeting, click "+Upload Legal Docs" to upload past or future agreements, so we'll be ready to help you. Any data or documents that you upload will be kept confidential pursuant to our Privacy Policy.

We're thrilled to have you onboard and your feedback is crucial to shaping Scopic Legal. Let's get to work!

**Important Note:** Scopic Legal is an AI assistant, not a law firm. The responses are for informational purposes only and do not constitute legal advice. Please ensure critical documents are reviewed by a qualified professional, whom we can connect you with if needed.
`;

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAttachmentIds, setPendingAttachmentIds] = useState<string[]>([]);
  const [showScopicIntro, setShowScopicIntro] = useState(false);

  const tokenReady = Boolean(accessToken);

  const resetConversationState = useCallback(() => {
    setActiveConversationId(null);
    setMessages(emptyMessages);
    setConversationFiles([]);
    setPendingAttachmentIds([]);
    setStreamedAssistantText("");
  }, []);

  const refreshConversations = useCallback(() => {
    if (!tokenReady) return;
    setConversationsLoading(true);
    listConversations(accessToken!)
      .then((res) => setConversations(res.conversations))
      .catch((error) => setErrorMessage(error.message || "Unable to load conversations."))
      .finally(() => setConversationsLoading(false));
  }, [accessToken, tokenReady]);

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

  const loadConversation = useCallback(
    (conversationId: string) => {
      if (!tokenReady || !conversationId) return;
      setShowScopicIntro(false);
      getConversation(accessToken!, conversationId)
        .then((data) => {
          setActiveConversationId(conversationId);
          setMessages(data.messages);
          setConversationFiles(data.files);
          setPendingAttachmentIds([]);
          setStreamedAssistantText("");
        })
        .catch((error) => setErrorMessage(error.message || "Unable to load conversation."));
    },
    [accessToken, tokenReady],
  );

  const startNewConversation = useCallback(() => {
    setShowScopicIntro(false);
    resetConversationState();
  }, [resetConversationState]);

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
    async (options: { text: string; modeOverride?: ChatMode; fileIds?: string[] }) => {
      if (!tokenReady || !profile) return;
      const trimmed = options.text.trim();
      if (!trimmed) return;

      // Once a user starts a real query, hide the intro (if it was shown).
      setShowScopicIntro(false);

      const fileIds = options.fileIds ?? [];
      const conversationId = activeConversationId;
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

      setMessages((prev) => [...prev, tempMessage]);
      setStreamedAssistantText("");
      streamedTextRef.current = ""; // Reset ref
      setIsStreaming(true);
      setErrorMessage(null);

      try {
        await streamChat(
          accessToken!,
          {
            conversation_id: conversationId,
            message: trimmed,
            file_ids: fileIds.length ? fileIds : null,
            mode: options.modeOverride ?? mode,
          },
          {
            onToken: (delta) => {
              const newText = delta ?? "";
              streamedTextRef.current += newText; // Update ref
              setStreamedAssistantText((prev) => prev + newText);
            },
            onDone: async (payload) => {
              setIsStreaming(false);
              
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
              
              // Update active conversation ID if it was a new conversation
              const isNewConversation = !activeConversationId && payload.conversation_id;
              if (isNewConversation) {
                setActiveConversationId(payload.conversation_id);
              }
              
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
    errorMessage,
    showScopicIntro,
    scopicIntroMarkdown: SCOPIC_INTRO_MARKDOWN,
    refreshConversations,
    loadConversation,
    startNewConversation,
    acceptTos: handleAcceptTos,
    registerFilesForConversation,
    uploadFile,
    sendMessage,
    deleteConversation,
  };
}

