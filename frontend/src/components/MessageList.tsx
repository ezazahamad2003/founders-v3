"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileMeta, Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  streamingMessage: string;
  isStreaming: boolean;
  profileId?: string | null;
  filesById: Record<string, FileMeta>;
  errorMessage: string | null;
  showIntro?: boolean;
  introMarkdown?: string;
}

export default function MessageList({
  messages,
  streamingMessage,
  isStreaming,
  profileId,
  filesById,
  errorMessage,
  showIntro,
  introMarkdown,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastMessageCountRef = useRef(0);

  // Check if user is near the bottom of the scroll container
  const isNearBottom = useCallback(() => {
    if (!scrollRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const threshold = 100; // pixels from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // Auto-scroll to bottom only if user is near bottom
  const scrollToBottom = useCallback((force = false) => {
    if (force || shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [shouldAutoScroll]);

  // Track scroll position to detect user-initiated scrolls
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShouldAutoScroll(isNearBottom());
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isNearBottom]);

  // Auto-scroll when new messages are added (user sends a message)
  useEffect(() => {
    const currentMessageCount = messages.length;
    const previousMessageCount = lastMessageCountRef.current;
    
    // If a new message was added (not just streaming update), always scroll
    if (currentMessageCount > previousMessageCount) {
      lastMessageCountRef.current = currentMessageCount;
      setShouldAutoScroll(true);
      scrollToBottom(true);
    }
  }, [messages.length, scrollToBottom]);

  // When streaming starts, check if we should auto-scroll
  useEffect(() => {
    if (isStreaming) {
      const nearBottom = isNearBottom();
      setShouldAutoScroll(nearBottom);
      if (nearBottom) {
        scrollToBottom();
      }
    }
  }, [isStreaming, isNearBottom, scrollToBottom]);

  // Auto-scroll during streaming only if user is near bottom
  useEffect(() => {
    if (isStreaming && shouldAutoScroll && streamingMessage) {
      scrollToBottom();
    }
  }, [streamingMessage, isStreaming, shouldAutoScroll, scrollToBottom]);

  const renderAttachments = (message: Message) => {
    const ids = Array.isArray(message.metadata?.input_files) ? (message.metadata!.input_files as string[]) : [];
    return ids
      .map((id) => filesById[id])
      .filter(Boolean) as FileMeta[];
  };

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scroll-smooth bg-gradient-to-b from-[#05060c] via-[#070812] to-[#05060c] px-8 py-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col space-y-4">
        {showIntro && introMarkdown ? (
          <MessageBubble
            role="system"
            content={introMarkdown}
            isStreaming={false}
            isOwn={false}
            attachments={[]}
          />
        ) : null}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            content={message.content}
            timestamp={message.created_at}
            isStreaming={false}
            isOwn={message.user_id === profileId}
            attachments={renderAttachments(message)}
          />
        ))}

        {isStreaming && streamingMessage ? (
          <MessageBubble
            role="assistant"
            content={streamingMessage}
            isStreaming
            timestamp={new Date().toISOString()}
            isOwn={false}
            attachments={[]}
          />
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}
        
        {/* Invisible anchor element to track the bottom */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

