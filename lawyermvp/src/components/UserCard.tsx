"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageSquare, FileText, Clock, Building2, Globe } from "lucide-react";
import { UserStats, getProfileImageUrl } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";

interface UserCardProps {
  user: UserStats;
}

function getInitials(user: UserStats): string {
  const name = user.full_name?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
  const email = user.email;
  if (!email) return "?";
  return email.substring(0, 2).toUpperCase();
}

// Deterministic gradient per user for avatar fallback
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

export default function UserCard({ user }: UserCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user.profile_image_path) return;
    getProfileImageUrl(user.profile_image_path).then(setImageUrl).catch(() => setImageUrl(null));
  }, [user.profile_image_path]);

  const initials = getInitials(user);
  const gradient = avatarGradient(user.user_id);
  const displayName = user.full_name || user.email?.split("@")[0] || "Unknown";

  return (
    <Link href={`/users/${user.user_id}`}>
      <div className="group relative bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden">
        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-violet-50/0 group-hover:from-indigo-50/60 group-hover:to-violet-50/40 transition-all duration-300 rounded-2xl pointer-events-none" />

        <div className="relative">
          {/* Header: avatar + name + last active */}
          <div className="flex items-start gap-3 mb-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={displayName}
                  width={52}
                  height={52}
                  className="w-[52px] h-[52px] rounded-full object-cover ring-2 ring-white shadow-md"
                />
              ) : (
                <div className={`w-[52px] h-[52px] rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-bold shadow-md ring-2 ring-white`}>
                  {initials}
                </div>
              )}
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-base truncate leading-tight">
                {displayName}
              </h3>
              {user.email && (
                <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
              )}
              {user.company_name && (
                <div className="flex items-center gap-1 mt-1">
                  <Building2 className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                  <p className="text-xs text-indigo-600 font-medium truncate">{user.company_name}</p>
                </div>
              )}
            </div>

            {/* Last active badge */}
            {user.last_activity && (
              <div className="flex-shrink-0 flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-full px-2 py-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  {formatRelativeTime(user.last_activity)}
                </span>
              </div>
            )}
          </div>

          {/* Website */}
          {user.website && (
            <div className="flex items-center gap-1.5 mb-4 -mt-1">
              <Globe className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-400 truncate">
                {user.website.replace(/^https?:\/\//, "")}
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-xl font-bold text-gray-900 leading-none">{user.total_conversations}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Chats</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <p className="text-xl font-bold text-gray-900 leading-none">{user.total_messages}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Messages</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-gray-900 leading-none">{user.total_documents}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Docs</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
