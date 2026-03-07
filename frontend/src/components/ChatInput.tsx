"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ChatMode, FileMeta, PromptMode } from "@/lib/types";
import { Listbox, Transition } from "@headlessui/react";
import {
  ChevronUpDownIcon,
  CheckIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface ChatInputProps {
  disabled: boolean;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  promptMode: PromptMode;
  onPromptModeChange: (mode: PromptMode) => void;
  onSend: (text: string) => Promise<void>;
  isStreaming: boolean;
  conversationId: string | null;
  supabase: SupabaseClient;
  profileId: string | null;
  accessToken: string | null; // NEW: Need token for direct upload
  uploadFile: (file: File, conversationId: string | null) => Promise<FileMeta>; // NEW: Direct upload function
  onFilesRegistered: (files: FileMeta[]) => void;
  pendingAttachments: FileMeta[];
  onRemoveAttachment: (fileId: string) => void;
}

export default function ChatInput({
  disabled,
  mode,
  onModeChange,
  promptMode,
  onPromptModeChange,
  onSend,
  isStreaming,
  conversationId,
  supabase,
  profileId,
  accessToken,
  uploadFile,
  onFilesRegistered,
  pendingAttachments,
  onRemoveAttachment,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = async (event?: React.FormEvent) => {
    // Prevent form submission/page refresh
    event?.preventDefault();
    
    // Wait for uploads to complete before sending
    if (!message.trim() || isStreaming || isUploading) return;
    
    // Store message and clear input immediately (optimistic UI)
    const messageToSend = message.trim();
    setMessage("");
    
    try {
      await onSend(messageToSend);
    } catch (error) {
      // If send fails, restore the message
      console.error("Failed to send message:", error);
      setMessage(messageToSend);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea as user types
  const handleMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    
    // Auto-resize logic
    const textarea = event.target;
    textarea.style.height = "auto"; // Reset height to recalculate
    const newHeight = Math.min(textarea.scrollHeight, 200); // Max height of 200px
    textarea.style.height = `${newHeight}px`;
  };

  const disabledSend = disabled || isStreaming || isUploading || !message.trim();
  const disabledUpload = isUploading;

  const modeOptions: { label: string; value: ChatMode }[] = useMemo(
    () => [
      { label: "Auto", value: "auto" },
      // Other modes hidden for Private Beta - only Auto is available
      // { label: "Chat", value: "chat" },
      // { label: "Vision", value: "vision" },
      // { label: "Files", value: "files" },
      // { label: "Deep research", value: "deep_research" },
    ],
    [],
  );

  const selectedMode = modeOptions.find((option) => option.value === mode) ?? modeOptions[0];

  const handleUploadClick = () => {
    if (disabledUpload) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      if (!accessToken) {
        throw new Error("Sign in again to attach files.");
      }

      const uploadedFiles: FileMeta[] = [];

      // NEW: Upload each file using OpenAI Files API first
      for (const file of Array.from(files)) {
        const fileMeta = await uploadFile(file, conversationId);
        uploadedFiles.push(fileMeta);
      }

      onFilesRegistered(uploadedFiles);
      event.target.value = "";
    } catch (error) {
      setUploadError((error as Error).message ?? "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const renderAttachmentCard = (file: FileMeta) => {
    const extension =
      file.original_name?.split(".").pop()?.toUpperCase() ??
      file.mime_type?.split("/").pop()?.toUpperCase() ??
      "FILE";
    return (
      <div
        key={file.id}
        className="app-input-alt app-border app-text relative flex w-full items-center gap-3 rounded-3xl border px-4 py-3 shadow-lg shadow-black/20 transition"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff5b5b]/15 text-xl text-[#ff7474]">
          <PaperClipIcon className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{file.original_name ?? "Attachment"}</span>
                <span className="app-muted text-xs uppercase tracking-wide">{extension}</span>
        </div>
        <button
          type="button"
          onClick={() => onRemoveAttachment(file.id)}
          className="app-muted absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-sm transition hover:bg-white/20 hover:app-text"
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <div className="app-bg app-border z-10 shrink-0 border-t px-4 py-5 sm:px-6">
      {/* Contract Review Mode Indicator */}
      {promptMode === "contract_review" && (
        <div className="mx-auto max-w-4xl mb-3 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300">
            <span>⚖️ Document Review Mode</span>
            <button
              onClick={() => onPromptModeChange("general")}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded-full hover:bg-indigo-500/20 transition"
              title="Switch to general mode"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      <div className="app-surface-2 app-border mx-auto max-w-4xl rounded-[32px] border px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
        {pendingAttachments.length ? (
          <div className="mb-3 flex flex-col gap-2">
            {pendingAttachments.map((file) => renderAttachmentCard(file))}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={disabledUpload}
            className="app-input app-border app-text flex h-11 w-11 items-center justify-center rounded-full border transition hover:app-border-strong disabled:cursor-not-allowed disabled:opacity-40"
            title="Attach documents"
          >
            {isUploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "+"
            )}
          </button>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="app-input app-text flex-1 resize-none overflow-y-auto rounded-3xl px-4 py-3 text-base outline-none placeholder:app-subtle"
            style={{ minHeight: "44px", maxHeight: "200px" }}
            disabled={disabled}
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={disabledSend}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#111] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        </form>

        {uploadError ? <p className="mt-2 text-xs text-red-400">{uploadError}</p> : null}
        {isUploading ? (
          <p className="mt-2 text-xs text-blue-400">
            <span className="inline-block animate-pulse">●</span> Processing document...
          </p>
        ) : null}

        <div className="app-muted mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span>
            A reminder that Scopic is an AI assistant providing information, not legal advice. No attorney-client relationship is formed here, and always review outputs with a qualified professional. Your data is private and will be kept confidential pursuant to our{" "}
            <a href="/legal/privacy-policy.html" target="_blank" className="underline hover:text-indigo-400 transition">
              Privacy Policy
            </a>
            .
          </span>
          {modeOptions.length > 1 && (
            <div className="app-text flex items-center gap-2">
              <span className="app-muted">Mode</span>
              <Listbox value={selectedMode} onChange={(option) => onModeChange(option.value)}>
                <div className="relative">
                  <Listbox.Button className="app-input app-border app-text flex min-w-[140px] items-center justify-between rounded-2xl border px-3 py-1.5 text-sm">
                    {selectedMode.label}
                    <ChevronUpDownIcon className="app-muted ml-2 h-4 w-4" />
                  </Listbox.Button>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className="app-surface app-border app-text absolute right-0 z-20 mt-2 max-h-60 w-full overflow-auto rounded-2xl border py-1 text-sm shadow-lg focus:outline-none">
                    {modeOptions.map((option) => (
                      <Listbox.Option
                        key={option.value}
                        value={option}
                        className={({ active }) =>
                          `flex cursor-pointer items-center justify-between px-3 py-2 ${
                            active ? "app-surface-2 app-text" : "app-muted"
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span>{option.label}</span>
                            {selected ? <CheckIcon className="h-4 w-4" /> : null}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

