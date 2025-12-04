"use client";

import { useEffect, useRef } from "react";
import { FileMeta, Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  streamingMessage: string;
  isStreaming: boolean;
  profileId?: string | null;
  filesById: Record<string, FileMeta>;
  errorMessage: string | null;
}

export default function MessageList({
  messages,
  streamingMessage,
  isStreaming,
  profileId,
  filesById,
  errorMessage,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when messages change or while streaming
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, isStreaming]);

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

