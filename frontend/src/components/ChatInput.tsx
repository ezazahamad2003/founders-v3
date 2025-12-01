"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ChatMode, FileMeta, RegisterFileInput } from "@/lib/types";
import { Listbox, Transition } from "@headlessui/react";
import {
  ChevronUpDownIcon,
  CheckIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

interface ChatInputProps {
  disabled: boolean;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onSend: (text: string) => Promise<void>;
  isStreaming: boolean;
  conversationId: string | null;
  supabase: SupabaseClient;
  profileId: string | null;
  registerFiles: (conversationId: string, files: RegisterFileInput[]) => Promise<FileMeta[]>;
  onFilesRegistered: (files: FileMeta[]) => void;
  pendingAttachments: FileMeta[];
  onRemoveAttachment: (fileId: string) => void;
}

export default function ChatInput({
  disabled,
  mode,
  onModeChange,
  onSend,
  isStreaming,
  conversationId,
  supabase,
  profileId,
  registerFiles,
  onFilesRegistered,
  pendingAttachments,
  onRemoveAttachment,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    await onSend(message);
    setMessage("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const disabledSend = disabled || isStreaming || !message.trim();
  const disabledUpload = isUploading;

  const modeOptions: { label: string; value: ChatMode }[] = useMemo(
    () => [
      { label: "Auto", value: "auto" },
      { label: "Chat", value: "chat" },
      { label: "Vision", value: "vision" },
      { label: "Files", value: "files" },
      { label: "Deep research", value: "deep_research" },
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
    if (!files?.length) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }
      const authUserId = data.session?.user.id ?? profileId ?? undefined;
      if (!authUserId) {
        throw new Error("Sign in again to attach files.");
      }

      const uploads: RegisterFileInput[] = [];
      // Use temporary folder if no conversation yet
      const folder = conversationId ?? "temp";
      
      for (const file of Array.from(files)) {
        const sanitizedName = file.name.replace(/\s+/g, "-");
        const path = `${authUserId}/${folder}/${Date.now()}-${sanitizedName}`;
        const { error } = await supabase.storage.from("uploads").upload(path, file, {
          upsert: true,
          cacheControl: "3600",
        });
        if (error) throw error;
        uploads.push({
          supabase_path: path,
          mime_type: file.type,
          original_name: file.name,
        });
      }
      
      // Register files (with or without conversation_id)
      const registered = await registerFiles(conversationId, uploads);
      onFilesRegistered(registered);
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
        className="relative flex w-full items-center gap-3 rounded-3xl border border-white/12 bg-[#0c0f17] px-4 py-3 text-white shadow-lg shadow-black/40 transition"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff5b5b]/15 text-xl text-[#ff7474]">
          <PaperClipIcon className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{file.original_name ?? "Attachment"}</span>
          <span className="text-xs uppercase tracking-wide text-white/60">{extension}</span>
        </div>
        <button
          type="button"
          onClick={() => onRemoveAttachment(file.id)}
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-sm text-white/70 transition hover:bg-white/20"
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <div className="border-t border-white/5 bg-[#05060c]/90 px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-[#16181f] px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
        {pendingAttachments.length ? (
          <div className="mb-3 flex flex-col gap-2">
            {pendingAttachments.map((file) => renderAttachmentCard(file))}
          </div>
        ) : null}

        <div className="flex items-end gap-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={disabledUpload}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#0d0f16] text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
            title="Attach documents"
          >
            {isUploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "+"
            )}
          </button>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="max-h-40 flex-1 resize-none rounded-3xl bg-[#0d0f16] px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
            disabled={disabled}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabledSend}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#111] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {uploadError ? <p className="mt-2 text-xs text-red-400">{uploadError}</p> : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span>A reminder that this is not legal advice, and that the Program is designed for Scopic to observe your self-serve legal behaviour.</span>
          {modeOptions.length > 1 && (
            <div className="flex items-center gap-2 text-white">
              <span className="text-white/60">Mode</span>
              <Listbox value={selectedMode} onChange={(option) => onModeChange(option.value)}>
                <div className="relative">
                  <Listbox.Button className="flex min-w-[140px] items-center justify-between rounded-2xl border border-white/15 bg-[#0d0f16] px-3 py-1.5 text-sm text-white">
                    {selectedMode.label}
                    <ChevronUpDownIcon className="ml-2 h-4 w-4 text-white/70" />
                  </Listbox.Button>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className="absolute right-0 z-20 mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-white/10 bg-[#0f1118] py-1 text-sm text-slate-100 shadow-lg focus:outline-none">
                    {modeOptions.map((option) => (
                      <Listbox.Option
                        key={option.value}
                        value={option}
                        className={({ active }) =>
                          `flex cursor-pointer items-center justify-between px-3 py-2 ${
                            active ? "bg-white/10 text-white" : "text-slate-200"
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

