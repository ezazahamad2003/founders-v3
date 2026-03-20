"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowserClient } from "@/lib/supabase/client";

interface VaultDoc {
  path: string;
  name: string;
  size: number;
  updatedAt: string | null;
}

// Must match backend (ProfileDrawer) and Supabase bucket name - case-sensitive
const PROFILE_BUCKET =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET?.trim()) ||
  "ProfileDrawer";

const formatBytes = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

function stripTimestampPrefix(name: string) {
  return name.replace(/^\d{13}-/, "");
}

async function listFolder(
  supabase: SupabaseClient,
  prefix: string,
): Promise<VaultDoc[]> {
  const { data, error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .list(prefix, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

  if (error) throw error;
  if (!data) return [];

  return data
    .filter((entry) => entry.metadata != null) // skip virtual folder entries
    .map((entry) => ({
      path: `${prefix}/${entry.name}`,
      name: stripTimestampPrefix(entry.name),
      size: entry.metadata?.size ?? 0,
      updatedAt: entry.updated_at ?? null,
    }));
}

export default function DocumentVaultPage() {
  const supabase = supabaseBrowserClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [documents, setDocuments] = useState<VaultDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auth
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Fetch documents from both the old (profile-library/) and new (direct) paths
  const fetchDocuments = useCallback(async () => {
    if (!supabase || !userId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Old path: {userId}/profile-library/  (original ProfileDrawer uploads)
      const [legacyDocs, newDocs] = await Promise.all([
        listFolder(supabase, `${userId}/profile-library`),
        listFolder(supabase, userId),
      ]);

      // Merge: new-style docs are direct files in user folder (not subfolders)
      // filter out any entry whose name is "profile-library" (it's a folder listing)
      const filteredNew = newDocs.filter((d) => !d.name.startsWith("profile-library"));

      // Deduplicate by path, legacy first (they were there first)
      const all = [...legacyDocs, ...filteredNew];
      setDocuments(all);
    } catch (e) {
      const msg = (e as Error).message || "Failed to load documents. Please try again.";
      setError(msg);
      console.error("[DocumentVault] fetchDocuments failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    if (userId) fetchDocuments();
    else setDocuments([]);
  }, [userId, fetchDocuments]);

  const uploadFiles = async (files: FileList | File[]) => {
    if (!supabase || !userId || !files || files.length === 0) return;
    setIsUploading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      for (const file of Array.from(files)) {
        const sanitized = file.name.replace(/\s+/g, "-");
        // Upload to the legacy profile-library path so old and new docs stay together
        const path = `${userId}/profile-library/${Date.now()}-${sanitized}`;
        const { error: uploadError } = await supabase.storage
          .from(PROFILE_BUCKET)
          .upload(path, file, { upsert: false, cacheControl: "3600" });
        if (uploadError) throw uploadError;
      }
      await fetchDocuments();
      setSuccessMsg(
        `${files.length === 1 ? "Document" : `${files.length} documents`} uploaded successfully.`,
      );
    } catch (e) {
      const msg = (e as Error).message || "Upload failed.";
      setError(msg);
      console.error("[DocumentVault] upload failed:", e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = async (doc: VaultDoc) => {
    if (!supabase) return;
    setBusyPath(doc.path);
    setError(null);
    try {
      const { data, error: urlErr } = await supabase.storage
        .from(PROFILE_BUCKET)
        .createSignedUrl(doc.path, 3600);
      if (urlErr) throw urlErr;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    } catch (e) {
      const msg = (e as Error).message || "Failed to open document.";
      setError(msg);
      console.error("[DocumentVault] createSignedUrl failed:", e);
    } finally {
      setBusyPath(null);
    }
  };

  const handleDelete = async (doc: VaultDoc) => {
    if (!supabase) return;
    if (!window.confirm(`Delete "${doc.name}"?`)) return;
    setBusyPath(doc.path);
    setError(null);
    setSuccessMsg(null);
    try {
      const { error: delErr } = await supabase.storage
        .from(PROFILE_BUCKET)
        .remove([doc.path]);
      if (delErr) throw delErr;
      await fetchDocuments();
      setSuccessMsg("Document deleted.");
    } catch (e) {
      const msg = (e as Error).message || "Delete failed.";
      setError(msg);
      console.error("[DocumentVault] delete failed:", e);
    } finally {
      setBusyPath(null);
    }
  };

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center app-bg p-6">
        <div className="app-surface app-border w-full max-w-xl rounded-3xl border p-8 text-center">
          <h1 className="text-xl font-semibold app-text">Missing Supabase configuration</h1>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center app-bg p-6">
        <div className="text-sm app-muted">Loading…</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center app-bg p-6">
        <div className="app-surface app-border w-full max-w-xl rounded-3xl border p-8 text-center">
          <h1 className="text-xl font-semibold app-text">Please sign in first</h1>
          <p className="mt-2 text-sm app-muted">Your document vault is available after login.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg app-text">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Document Vault</h1>
            <p className="mt-1 text-sm app-muted">
              Upload legal documents, contracts, and reference files to your personal vault.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border app-border app-surface-2 px-4 py-2 text-sm font-medium app-text transition hover:opacity-90"
          >
            Back to Workspace
          </Link>
        </div>

        {/* Alerts */}
        {error ? (
          <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}
        {successMsg ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {successMsg}
          </div>
        ) : null}

        {/* Drop zone + list */}
        <section className="app-surface app-border rounded-3xl border p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Your Documents</h2>
              <p className="mt-1 text-sm app-muted">
                {documents.length === 0
                  ? "No documents uploaded yet."
                  : `${documents.length} document${documents.length === 1 ? "" : "s"} in your vault.`}
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20">
              {isUploading ? "Uploading…" : "Upload Documents"}
              <input
                type="file"
                multiple
                className="hidden"
                disabled={isUploading}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    await uploadFiles(files);
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {/* Drag-and-drop zone */}
          <div
            className={`mt-4 rounded-2xl border border-dashed p-4 transition ${
              isDragging ? "border-indigo-400 bg-indigo-500/20" : "border-white/10 bg-white/5"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);
              await uploadFiles(e.dataTransfer.files);
            }}
          >
            <p className="text-center text-sm app-muted">
              {isUploading ? "Uploading…" : "Drop files here or use the button above"}
            </p>
            <p className="mt-1 text-center text-xs" style={{ color: "var(--app-muted, #6b7280)" }}>
              PDF, DOCX, images — up to 25 MB each
            </p>
          </div>

          {/* Document list */}
          <div className="mt-5 overflow-hidden rounded-2xl border app-border">
            {isLoading ? (
              <div className="p-6 text-sm app-muted text-center">Loading documents…</div>
            ) : documents.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-4xl mb-3">📁</div>
                <p className="text-sm font-medium app-text">No documents yet</p>
                <p className="mt-1 text-xs app-muted">
                  Upload contracts, agreements, or other legal files you want to store securely.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[color:var(--app-border)]">
                {documents.map((doc) => (
                  <div
                    key={doc.path}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 text-lg">📄</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium app-text truncate">{doc.name}</p>
                        <p className="mt-0.5 text-xs app-muted">
                          {formatBytes(doc.size)}
                          {doc.updatedAt
                            ? ` · ${new Date(doc.updatedAt).toLocaleString()}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleView(doc)}
                        disabled={busyPath === doc.path}
                        className="rounded-lg border app-border app-surface-2 px-3 py-1.5 text-xs font-medium app-text transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc)}
                        disabled={busyPath === doc.path}
                        className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:border-red-500/60 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
