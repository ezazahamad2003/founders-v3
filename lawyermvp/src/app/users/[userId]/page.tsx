"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getUserDetail, UserDetail, getFileViewUrl } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, MessageSquare, FileText, User, Loader2, Eye } from "lucide-react";
import Link from "next/link";

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;
  
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingFileId, setViewingFileId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await getUserDetail(userId);
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load user");
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const handleViewFile = async (docId: string, supabasePath: string) => {
    setViewingFileId(docId);
    try {
      const url = await getFileViewUrl(supabasePath);
      if (url) {
        window.open(url, "_blank", "noopener");
      } else {
        alert("Failed to generate file view URL. Please try again.");
      }
    } catch (err) {
      console.error("Error viewing file:", err);
      alert("Failed to view file. Please try again.");
    } finally {
      setViewingFileId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error || "User not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user.full_name || user.email || "Unknown User"}
              </h1>
              {user.email && <p className="text-gray-600">{user.email}</p>}
              {user.company_name && <p className="text-gray-500 text-sm">{user.company_name}</p>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <p className="text-sm font-medium text-gray-600">Conversations</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{user.total_conversations}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <p className="text-sm font-medium text-gray-600">Messages</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{user.total_messages}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <p className="text-sm font-medium text-gray-600">Documents</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{user.total_documents}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Conversations */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Conversations</h2>
            {user.conversations.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {user.conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/conversations/${conv.id}`}
                    className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {conv.title || "Untitled Conversation"}
                      </h3>
                      <span className="text-xs text-gray-500">{conv.message_count} msgs</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Updated: {formatDate(conv.updated_at)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Documents</h2>
            {user.documents.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No documents uploaded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {user.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {doc.original_name || "Unnamed Document"}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {doc.mime_type || "Unknown type"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Uploaded: {formatDate(doc.created_at)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewFile(doc.id, doc.supabase_path)}
                        disabled={viewingFileId === doc.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {viewingFileId === doc.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Opening...
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            View
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
