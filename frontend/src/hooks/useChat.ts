"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [mode, setMode] = useState<ChatMode>("auto");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAttachmentIds, setPendingAttachmentIds] = useState<string[]>([]);

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
    resetConversationState();
  }, [resetConversationState]);

  const handleAcceptTos = useCallback(async () => {
    if (!tokenReady) return;
    try {
      const updated = await acceptTos(accessToken!);
      setProfile(updated);
      setRequiresTos(false);
      refreshConversations();
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
              setStreamedAssistantText((prev) => prev + (delta ?? ""));
            },
            onDone: async (payload) => {
              setIsStreaming(false);
              setStreamedAssistantText("");
              setPendingAttachmentIds([]);
              // Reload conversation detail to get the new message
              await loadConversation(payload.conversation_id);
              // Refresh conversation list in background (don't await)
              refreshConversations();
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
      loadConversation,
      mode,
      profile,
      refreshConversations,
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

