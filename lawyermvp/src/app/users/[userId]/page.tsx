"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { getUserDetail, UserDetail, getFileViewUrl, getProfileDocViewUrl, getProfileImageUrl } from "@/lib/api";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  ArrowLeft, MessageSquare, FileText, Loader2, Eye,
  Download, Building2, Globe, Mail, Calendar, User,
} from "lucide-react";
import Link from "next/link";

type Tab = "activity" | "profile";

const GRADIENTS = [
  "from-violet-500 to-indigo-500",
  "from-indigo-500 to-cyan-500",
  "from-pink-500 to-rose-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-blue-500",
];
function avatarGradient(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}
function getInitials(name: string | null, email: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (email) return email.substring(0, 2).toUpperCase();
  return "?";
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingFileId, setViewingFileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("activity");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    getUserDetail(userId)
      .then((data) => {
        setUser(data);
        return getProfileImageUrl(data.profile_image_path);
      })
      .then(setProfileImageUrl)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load user"))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleViewFile = async (docId: string, supabasePath: string) => {
    setViewingFileId(docId);
    try {
      const url = await getFileViewUrl(supabasePath);
      if (url) window.open(url, "_blank", "noopener");
    } finally {
      setViewingFileId(null);
    }
  };

  const handleDownloadFile = async (docId: string, supabasePath: string, filename: string) => {
    setViewingFileId(docId);
    try {
      const url = await getFileViewUrl(supabasePath);
      if (!url) return;
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener"; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
    } finally {
      setViewingFileId(null);
    }
  };

  const handleViewProfileDoc = async (key: string, bucket: string, path: string) => {
    setViewingFileId(key);
    try {
      const url = await getProfileDocViewUrl(bucket, path);
      if (url) window.open(url, "_blank", "noopener");
    } finally {
      setViewingFileId(null);
    }
  };

  const handleDownloadProfileDoc = async (key: string, bucket: string, path: string, filename: string) => {
    setViewingFileId(key);
    try {
      const url = await getProfileDocViewUrl(bucket, path);
      if (!url) return;
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener"; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
    } finally {
      setViewingFileId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">{error || "User not found"}</div>
      </div>
    );
  }

  const displayName = user.full_name || user.email?.split("@")[0] || "Unknown";
  const gradient = avatarGradient(user.user_id);
  const initials = getInitials(user.full_name, user.email);
  const totalDocs = user.profile_documents.length + user.documents.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-0">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-5">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-end gap-5 pb-0">
            {/* Avatar */}
            <div className="flex-shrink-0 mb-4">
              {profileImageUrl ? (
                <Image
                  src={profileImageUrl}
                  alt={displayName}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-lg"
                />
              ) : (
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white shadow-lg`}>
                  {initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 mb-4">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{displayName}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                {user.email && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5" />
                    {user.email}
                  </div>
                )}
                {user.company_name && (
                  <div className="flex items-center gap-1 text-sm text-indigo-600 font-medium">
                    <Building2 className="w-3.5 h-3.5" />
                    {user.company_name}
                  </div>
                )}
                {user.website && (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-500 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {user.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {formatDate(user.created_at)}
                </div>
              </div>
            </div>

            {/* Stats pills */}
            <div className="hidden sm:flex items-center gap-3 mb-4">
              <div className="text-center bg-indigo-50 rounded-xl px-4 py-2">
                <p className="text-xl font-bold text-indigo-700">{user.total_conversations}</p>
                <p className="text-[10px] text-indigo-500 uppercase tracking-wide">Chats</p>
              </div>
              <div className="text-center bg-violet-50 rounded-xl px-4 py-2">
                <p className="text-xl font-bold text-violet-700">{user.total_messages}</p>
                <p className="text-[10px] text-violet-500 uppercase tracking-wide">Messages</p>
              </div>
              <div className="text-center bg-emerald-50 rounded-xl px-4 py-2">
                <p className="text-xl font-bold text-emerald-700">{totalDocs}</p>
                <p className="text-[10px] text-emerald-500 uppercase tracking-wide">Docs</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            {(["activity", "profile"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab === "activity" ? (
                  <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" />Activity</span>
                ) : (
                  <span className="flex items-center gap-1.5"><User className="w-4 h-4" />Profile & Docs</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Activity tab ── */}
        {activeTab === "activity" && (
          <div>
            {user.conversations.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {user.conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/conversations/${conv.id}`}
                    className="flex items-start justify-between bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-indigo-100 transition-colors">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conv.title || "Untitled Conversation"}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {conv.message_count} message{conv.message_count !== 1 ? "s" : ""} · Updated {formatRelativeTime(conv.updated_at)}
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180 flex-shrink-0 mt-1 group-hover:text-indigo-400 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Profile & Docs tab ── */}
        {activeTab === "profile" && (
          <div className="space-y-8">
            {/* Profile info card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Profile Info</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: User, label: "Name", value: user.full_name },
                  { icon: Mail, label: "Email", value: user.email },
                  { icon: Building2, label: "Company", value: user.company_name },
                  { icon: Globe, label: "Website", value: user.website },
                ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                      <p className="text-sm text-gray-800 font-medium mt-0.5 break-all">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile documents (vault) */}
            {user.profile_documents.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Document Vault</h2>
                <div className="space-y-2">
                  {user.profile_documents.map((doc) => {
                    const key = `${doc.bucket}:${doc.path}`;
                    return (
                      <div key={key} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-violet-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {doc.updated_at ? formatDate(doc.updated_at) : "recently"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleViewProfileDoc(key, doc.bucket, doc.path)}
                            disabled={viewingFileId === key}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition disabled:opacity-50"
                          >
                            {viewingFileId === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                            View
                          </button>
                          <button
                            onClick={() => handleDownloadProfileDoc(key, doc.bucket, doc.path, doc.name)}
                            disabled={viewingFileId === key}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Query attachments */}
            {user.documents.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Query Attachments</h2>
                <div className="space-y-2">
                  {user.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.original_name || "Unnamed"}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{doc.mime_type || "Unknown type"} · {formatDate(doc.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleViewFile(doc.id, doc.supabase_path)}
                          disabled={viewingFileId === doc.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition disabled:opacity-50"
                        >
                          {viewingFileId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                          View
                        </button>
                        <button
                          onClick={() => handleDownloadFile(doc.id, doc.supabase_path, doc.original_name || "download")}
                          disabled={viewingFileId === doc.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {user.profile_documents.length === 0 && user.documents.length === 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No documents uploaded</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
