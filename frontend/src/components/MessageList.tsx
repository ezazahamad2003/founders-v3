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
  onStartDocumentReview?: () => void;
  onSendMessage?: (message: string) => void;
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
  onStartDocumentReview,
  onSendMessage,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastMessageCountRef = useRef(0);
  const userScrolledRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user is near the bottom of the scroll container
  const isNearBottom = useCallback(() => {
    if (!scrollRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const threshold = 150; // pixels from bottom
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
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Mark that user has scrolled
      userScrolledRef.current = true;

      // Debounce: wait a bit before checking if we should resume auto-scroll
      scrollTimeoutRef.current = setTimeout(() => {
        const nearBottom = isNearBottom();
        setShouldAutoScroll(nearBottom);
        userScrolledRef.current = false;
      }, 150); // 150ms debounce
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isNearBottom]);

  // Auto-scroll when new messages are added (user sends a message)
  useEffect(() => {
    const currentMessageCount = messages.length;
    const previousMessageCount = lastMessageCountRef.current;
    
    // If a new message was added (not just streaming update), always scroll
    if (currentMessageCount > previousMessageCount) {
      lastMessageCountRef.current = currentMessageCount;
      setShouldAutoScroll(true);
      userScrolledRef.current = false;
      scrollToBottom(true);
    }
  }, [messages.length, scrollToBottom]);

  // When streaming starts, check if we should auto-scroll
  useEffect(() => {
    if (isStreaming && !userScrolledRef.current) {
      const nearBottom = isNearBottom();
      setShouldAutoScroll(nearBottom);
    }
  }, [isStreaming, isNearBottom]);

  // Auto-scroll during streaming only if user hasn't manually scrolled and is near bottom
  useEffect(() => {
    if (isStreaming && shouldAutoScroll && streamingMessage && !userScrolledRef.current) {
      // Use requestAnimationFrame to avoid blocking the UI
      requestAnimationFrame(() => {
        scrollToBottom();
      });
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

        {!showIntro && messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col gap-6 pt-12">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-white tracking-tight">How can I help you today?</h2>
              <p className="mt-2 text-[15px] text-slate-400">Choose a starting point or ask anything</p>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={onStartDocumentReview}
                className="group flex flex-col gap-2 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-4 text-left transition hover:border-indigo-400 hover:bg-indigo-500/20"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚖️</span>
                  <span className="font-medium text-indigo-300">Document Review</span>
                </div>
                <p className="text-sm text-slate-400">
                  Upload a contract and ChatGPT 5.2 can identify risks, analyze clauses and suggestion improvements based on the prompt of your choice
                </p>
              </button>

              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <span className="font-medium text-white">Legal Questions</span>
                </div>
                <p className="text-sm text-slate-400">
                  Ask about fundraising, employment, contracts, IP, or any startup legal topic
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Trending Questions</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onSendMessage?.("Should I incorporate in Delaware or my home state?")}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-[15px] text-slate-300 transition hover:border-white/20 hover:bg-white/10"
                >
                  &quot;Should I incorporate in Delaware or my home state?&quot;
                </button>
                <button
                  onClick={() => onSendMessage?.("What are standard SAFE terms for a pre-seed round?")}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-[15px] text-slate-300 transition hover:border-white/20 hover:bg-white/10"
                >
                  &quot;What are standard SAFE terms for a pre-seed round?&quot;
                </button>
                <button
                  onClick={() => onSendMessage?.("How do I protect my IP before raising capital?")}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-[15px] text-slate-300 transition hover:border-white/20 hover:bg-white/10"
                >
                  &quot;How do I protect my IP before raising capital?&quot;
                </button>
              </div>
            </div>
          </div>
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

        {isStreaming && !streamingMessage ? (
          <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[#1a1c24] px-6 py-4 text-slate-300 shadow-lg">
            <div className="flex gap-1">
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "0ms" }} />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "150ms" }} />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-[15px] text-slate-300">Thinking...</span>
          </div>
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

