"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UserProfile } from "@/lib/types";

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  supabase: SupabaseClient;
  profile: UserProfile | null;
}

interface ProfileDoc {
  path: string;
  name: string;
  size: number;
  updatedAt: string | null;
}

export default function ProfileDrawer({ open, onClose, supabase, profile }: ProfileDrawerProps) {
  const [documents, setDocuments] = useState<ProfileDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Supabase bucket for user profile documents (separate from chat attachments)
  // Set NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET in .env or defaults to "profiledrawer"
  const profileBucket =
    process.env.NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET?.trim() || "profiledrawer";

  const folderPrefix = useMemo(() => {
    if (!profile?.id) return null;
    return `${profile.id}/profile-library`;
  }, [profile]);

  const fetchDocuments = useCallback(async () => {
    if (!folderPrefix) return;
    setLoading(true);
    setError(null);
    const { data, error: listError } = await supabase.storage.from(profileBucket).list(folderPrefix, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (listError) {
      setError(listError.message);
    } else {
      setDocuments(
        (data ?? [])
          .filter((entry) => !entry.name.endsWith("/"))
          .map((entry) => ({
            path: `${folderPrefix}/${entry.name}`,
            name: entry.name.replace(/^\d+-/, ""),
            size: entry.metadata?.size ?? 0,
            updatedAt: entry.updated_at ?? null,
          })),
      );
    }
    setLoading(false);
  }, [folderPrefix, profileBucket, supabase]);

  useEffect(() => {
    if (open) {
      fetchDocuments();
    }
  }, [open, fetchDocuments]);

  const uploadFiles = async (files: FileList | File[]) => {
    if (!folderPrefix || !profile?.id) return;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const sanitized = file.name.replace(/\s+/g, "-");
        const path = `${folderPrefix}/${Date.now()}-${sanitized}`;
        const { error: uploadError } = await supabase.storage.from(profileBucket).upload(path, file, {
          upsert: false,
          cacheControl: "3600",
        });
        if (uploadError) {
          throw uploadError;
        }
      }
      await fetchDocuments();
    } catch (uploadErr) {
      setError((uploadErr as Error).message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      await uploadFiles(files);
      event.target.value = "";
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files) {
      await uploadFiles(files);
    }
  };

  const handleDownload = async (doc: ProfileDoc) => {
    try {
      const { data, error: urlError } = await supabase.storage.from(profileBucket).createSignedUrl(doc.path, 60);
      if (urlError) throw urlError;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener");
      } else {
        throw new Error("Failed to generate download URL.");
      }
    } catch (downloadErr) {
      setError((downloadErr as Error).message ?? "Download failed.");
    }
  };

  const handleDelete = async (doc: ProfileDoc) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    try {
      const { error: deleteError } = await supabase.storage.from(profileBucket).remove([doc.path]);
      if (deleteError) throw deleteError;
      await fetchDocuments();
    } catch (deleteErr) {
      setError((deleteErr as Error).message ?? "Delete failed.");
    }
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0b0e16] p-6 text-white shadow-2xl">
                <Dialog.Title className="text-xl font-semibold">Legal Documents for Private Beta</Dialog.Title>
                <p className="mt-1 text-sm text-slate-400">
                  Upload any legal documents, emails, etc. that you wish to be analyzed as part of our Private Beta program. These are separate from the Legal Query attachments.
                </p>

                <div
                  className={`mt-5 rounded-2xl border border-dashed p-4 transition ${
                    isDragging
                      ? "border-indigo-400 bg-indigo-500/20"
                      : "border-white/15 bg-white/5"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-sm text-slate-300">
                    <span className="text-lg font-medium">{uploading ? "Uploading…" : "Drop files or browse"}</span>
                    <span className="text-xs text-slate-500">PDF, DOCX, images. Up to 25 MB each.</span>
                    <input type="file" className="hidden" multiple onChange={handleUpload} disabled={uploading} />
                  </label>
                </div>

                {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

                <div className="mt-5 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Documents</div>
                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-white/10">
                    {loading ? (
                      <div className="p-4 text-sm text-slate-400">Loading documents…</div>
                    ) : documents.length === 0 ? (
                      <div className="p-4 text-sm text-slate-400">No personal uploads yet.</div>
                    ) : (
                      documents.map((doc) => (
                        <div
                          key={doc.path}
                          className="flex items-center justify-between border-b border-white/5 px-4 py-3 last:border-b-0"
                        >
                          <div>
                            <p className="text-sm font-medium">{doc.name}</p>
                            <p className="text-xs text-slate-500">
                              {(doc.size / 1024).toFixed(1)} KB ·{" "}
                              {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : "recently added"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDownload(doc)}
                              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white transition hover:border-white/40"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDelete(doc)}
                              className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-400 transition hover:border-red-500/50 hover:bg-red-500/20"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
                  <a
                    href="https://runway6.vc/meetings/abhanot/dpcheckin?uuid=d4556964-cc24-4a30-8c61-b0d456a87f30"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-5 py-2 text-sm text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20"
                  >
                    Book Check-In Meeting
                  </a>
                  <button
                    onClick={onClose}
                    className="rounded-full border border-white/10 px-5 py-2 text-sm text-white transition hover:border-white/40"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

