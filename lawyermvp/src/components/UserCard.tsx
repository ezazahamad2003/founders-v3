"use client";

import { UserStats } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { User, MessageSquare, FileText } from "lucide-react";
import Link from "next/link";

interface UserCardProps {
  user: UserStats;
}

export default function UserCard({ user }: UserCardProps) {
  return (
    <Link href={`/users/${user.user_id}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">
                {user.full_name || user.email || "Unknown User"}
              </h3>
              {user.email && (
                <p className="text-sm text-gray-500">{user.email}</p>
              )}
            </div>
          </div>
          {user.last_activity && (
            <span className="text-xs text-gray-400">
              {formatRelativeTime(user.last_activity)}
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
              <MessageSquare className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{user.total_conversations}</p>
            <p className="text-xs text-gray-500">Conversations</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
              <MessageSquare className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{user.total_messages}</p>
            <p className="text-xs text-gray-500">Messages</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
              <FileText className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{user.total_documents}</p>
            <p className="text-xs text-gray-500">Documents</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
