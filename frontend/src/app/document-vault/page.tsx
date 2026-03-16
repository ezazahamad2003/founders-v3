"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import {
  deleteProfileDocument,
  getProfileDocumentDownloadUrl,
  listProfileDocuments,
  uploadProfileDocument,
} from "@/lib/api";
import { ProfileDocument } from "@/lib/types";
import { supabaseBrowserClient } from "@/lib/supabase/client";

const formatBytes = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DocumentVaultPage() {
  const supabase = supabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [documents, setDocuments] = useState<ProfileDocument[]>([]);
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(false);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [busyDocumentPath, setBusyDocumentPath] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const accessToken = useMemo(() => session?.access_token ?? null, [session]);

  const refreshDocuments = useCallback(async (token: string) => {
    setIsDocumentsLoading(true);
    try {
      const response = await listProfileDocuments(token);
      setDocuments(response.documents ?? []);
    } finally {
      setIsDocumentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setDocuments([]);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    refreshDocuments(accessToken).catch((error) => {
      setErrorMessage((error as Error).message || "Failed to load your documents.");
    });
  }, [accessToken, refreshDocuments]);

  const handleDocumentsUpload = async (files: FileList | null) => {
    if (!accessToken || !files || files.length === 0) return;

    setIsUploadingDocuments(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      for (const file of Array.from(files)) {
        await uploadProfileDocument(accessToken, file);
      }
      await refreshDocuments(accessToken);
      setSuccessMessage(`${files.length === 1 ? "Document" : `${files.length} documents`} uploaded successfully.`);
    } catch (error) {
      setErrorMessage((error as Error).message || "Failed to upload document.");
    } finally {
      setIsUploadingDocuments(false);
    }
  };

  const handleViewDocument = async (doc: ProfileDocument) => {
    if (!accessToken) return;
    setBusyDocumentPath(doc.path);
    setErrorMessage(null);

    try {
      const response = await getProfileDocumentDownloadUrl(accessToken, doc.path);
      window.open(response.url, "_blank", "noopener");
    } catch (error) {
      setErrorMessage((error as Error).message || "Failed to open document.");
    } finally {
      setBusyDocumentPath(null);
    }
  };

  const handleDeleteDocument = async (doc: ProfileDocument) => {
    if (!accessToken) return;
    if (!window.confirm(`Delete "${doc.name}"?`)) return;

    setBusyDocumentPath(doc.path);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await deleteProfileDocument(accessToken, doc.path);
      await refreshDocuments(accessToken);
      setSuccessMessage("Document deleted.");
    } catch (error) {
      setErrorMessage((error as Error).message || "Failed to delete document.");
    } finally {
      setBusyDocumentPath(null);
    }
  };

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center app-bg p-6">
        <div className="app-surface app-border w-full max-w-xl rounded-3xl border p-8 text-center">
          <h1 className="text-xl font-semibold app-text">Missing Supabase configuration</h1>
          <p className="mt-2 text-sm app-muted">
            Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to use the document vault.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center app-bg p-6">
        <div className="text-sm app-muted">Loading document vault…</div>
      </div>
    );
  }

  if (!accessToken) {
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

        {errorMessage ? (
          <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {successMessage}
          </div>
        ) : null}

        <section className="app-surface app-border rounded-3xl border p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Your Documents</h2>
              <p className="mt-1 text-sm app-muted">
                {documents.length === 0
                  ? "No documents uploaded yet. Upload files to get started."
                  : `${documents.length} document${documents.length === 1 ? "" : "s"} in your vault.`}
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20">
              {isUploadingDocuments ? "Uploading…" : "Upload Documents"}
              <input
                type="file"
                multiple
                className="hidden"
                disabled={isUploadingDocuments}
                onChange={async (event) => {
                  await handleDocumentsUpload(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border app-border">
            {isDocumentsLoading ? (
              <div className="p-6 text-sm app-muted text-center">Loading document vault…</div>
            ) : documents.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-4xl mb-3">📁</div>
                <p className="text-sm font-medium app-text">No documents yet</p>
                <p className="mt-1 text-xs app-muted">Upload contracts, agreements, or other legal files you want to store securely.</p>
              </div>
            ) : (
              <div className="divide-y divide-[color:var(--app-border)]">
                {documents.map((doc) => (
                  <div key={doc.path} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 text-lg">📄</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium app-text truncate">{doc.name}</p>
                        <p className="mt-0.5 text-xs app-muted">
                          {formatBytes(doc.size)}
                          {doc.updatedAt ? ` · ${new Date(doc.updatedAt).toLocaleString()}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc)}
                        disabled={busyDocumentPath === doc.path}
                        className="rounded-lg border app-border app-surface-2 px-3 py-1.5 text-xs font-medium app-text transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc)}
                        disabled={busyDocumentPath === doc.path}
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
