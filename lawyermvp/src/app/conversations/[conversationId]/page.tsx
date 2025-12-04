"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getConversationDetail, ConversationDetail } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, MessageSquare, Loader2, User, Bot } from "lucide-react";
import Link from "next/link";

export default function ConversationDetailPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
