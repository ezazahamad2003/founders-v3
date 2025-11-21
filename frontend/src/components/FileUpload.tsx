"use client";

import { useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FileMeta, RegisterFileInput } from "@/lib/types";

interface FileUploadProps {
  conversationId: string | null;
  profileId: string | null;
  supabase: SupabaseClient;
  registerFiles: (conversationId: string, files: RegisterFileInput[]) => Promise<FileMeta[]>;
  onFilesRegistered: (files: FileMeta[]) => void;
}

export default function FileUpload({
  conversationId,
  profileId,
  supabase,
  registerFiles,
  onFilesRegistered,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadClick = () => {
    if (!conversationId) return;
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!conversationId || !profileId) {
      setUploadError("Start a conversation before attaching files.");
      return;
    }
    const files = event.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const uploads: RegisterFileInput[] = [];
      for (const file of Array.from(files)) {
        const sanitizedName = file.name.replace(/\s+/g, "-");
        const path = `${profileId}/${conversationId}/${Date.now()}-${sanitizedName}`;
        const { error } = await supabase.storage.from("uploads").upload(path, file, {
          upsert: true,
          cacheControl: "3600",
        });
        if (error) {
          throw error;
        }
        uploads.push({
          supabase_path: path,
          mime_type: file.type,
          original_name: file.name,
        });
      }
      const registered = await registerFiles(conversationId, uploads);
      onFilesRegistered(registered);
      event.target.value = "";
    } catch (error) {
      setUploadError((error as Error).message ?? "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const disabled = !conversationId || !profileId || isUploading;

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={handleUploadClick}
        className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
        title={
          conversationId ? "Attach files from Supabase Storage" : "Start a chat to attach files"
        }
      >
        {isUploading ? "Uploading…" : "📎 Attach files"}
      </button>
      {uploadError ? <p className="text-xs text-red-400">{uploadError}</p> : null}
      {!conversationId ? (
        <p className="text-xs text-slate-400">Files attach after a conversation exists.</p>
      ) : null}
    </div>
  );
}

