"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getConversationDetail, ConversationDetail, getFileViewUrl } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, MessageSquare, Loader2, User, Bot, FileText, Eye } from "lucide-react";
import Link from "next/link";

export default function ConversationDetailPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingFileId, setViewingFileId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConversation() {
      try {
        const data = await getConversationDetail(conversationId);
        setConversation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load conversation");
      } finally {
        setLoading(false);
      }
    }

    if (conversationId) {
      fetchConversation();
    }
  }, [conversationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error || "Conversation not found"}
        </div>
      </div>
    );
  }

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

  const handleDownloadFile = async (docId: string, supabasePath: string, filename: string) => {
    setViewingFileId(docId);
    try {
      const url = await getFileViewUrl(supabasePath);
      if (!url) {
        alert("Failed to generate download URL. Please try again.");
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      a.download = filename || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Error downloading file:", err);
      alert("Failed to download file. Please try again.");
    } finally {
      setViewingFileId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mt-4">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {conversation.title || "Untitled Conversation"}
              </h1>
              <p className="text-sm text-gray-500">
                Created: {formatDate(conversation.created_at)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Attachments ({conversation.documents.length})
            </h2>
          </div>

          {conversation.documents.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No documents attached to this query.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {conversation.documents.map((doc) => (
                <div key={doc.id} className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {doc.original_name || "Unnamed Document"}
                        </h3>
                        <p className="text-sm text-gray-500">{doc.mime_type || "Unknown type"}</p>
                        <p className="text-xs text-gray-400 mt-1">Uploaded: {formatDate(doc.created_at)}</p>
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
                    <button
                      onClick={() => handleDownloadFile(doc.id, doc.supabase_path, doc.original_name || "download")}
                      disabled={viewingFileId === doc.id}
                      className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Messages ({conversation.messages.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {conversation.messages.map((message) => (
              <div key={message.id} className="p-6">
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === "user" 
                      ? "bg-blue-100" 
                      : message.role === "assistant"
                      ? "bg-green-100"
                      : "bg-gray-100"
                  }`}>
                    {message.role === "user" ? (
                      <User className={`w-5 h-5 ${message.role === "user" ? "text-blue-600" : "text-gray-600"}`} />
                    ) : message.role === "assistant" ? (
                      <Bot className="w-5 h-5 text-green-600" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900 capitalize">
                        {message.role}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
