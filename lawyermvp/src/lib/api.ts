import { supabase } from "./supabase";

export interface UserStats {
  user_id: string;
  email: string | null;
  full_name: string | null;
  referral_source: string | null;
  total_conversations: number;
  total_messages: number;
  total_documents: number;
  last_activity: string | null;
}

export interface ConversationPreview {
  id: string;
  title: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentPreview {
  id: string;
  original_name: string | null;
  mime_type: string | null;
  supabase_path: string;
  created_at: string;
}

export interface ProfileDocumentPreview {
  bucket: string;
  path: string;
  name: string;
  size: number;
  updated_at: string | null;
}

export interface UserDetail {
  user_id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  role: string;
  created_at: string;
  total_conversations: number;
  total_messages: number;
  total_documents: number;
  conversations: ConversationPreview[];
  documents: DocumentPreview[];
  profile_documents: ProfileDocumentPreview[];
}

export interface MessageDetail {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ConversationDetail {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  messages: MessageDetail[];
  documents: DocumentPreview[];
}

export async function getAllUsers(): Promise<UserStats[]> {
  console.log('Fetching all users...');
  
  // Get all client profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, referral_source, role')
    .eq('role', 'client');

  console.log('Profiles response:', { profiles, error: profileError });

  if (profileError) {
    console.error('Error fetching users:', profileError);
    // Return empty array instead of throwing to see if it's an RLS issue
    return [];
  }

  if (!profiles || profiles.length === 0) {
    console.log('No profiles found');
    return [];
  }

  // For each user, get their stats
  const usersWithStats = await Promise.all(
    profiles.map(async (profile: any) => {
      console.log('Fetching stats for user:', profile.id);
      
      // Get conversations for this user
      const { data: userConversations } = await supabase
        .from('conversations')
        .select('id, created_at')
        .eq('user_id', profile.id);

      const conversationIds = (userConversations || []).map((c: any) => c.id);
      
      // Get conversation count
      const { count: convCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      // Get message count (only if there are conversations)
      let msgCount = 0;
      if (conversationIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', conversationIds);
        msgCount = count || 0;
      }

      // Get document count
      const { count: docCount } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      // Get profile-library document count (Supabase Storage; service-role via Next API route)
      const profileDocs = await getProfileDocuments(profile.id);

      // Get last activity (only if there are conversations)
      let lastActivity = null;
      if (conversationIds.length > 0) {
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('created_at')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        lastActivity = lastMessage?.created_at || null;
      }

      return {
        user_id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        referral_source: profile.referral_source ?? null,
        total_conversations: convCount || 0,
        total_messages: msgCount,
        total_documents: (docCount || 0) + profileDocs.length,
        last_activity: lastActivity,
      };
    })
  );

  // Sort by last activity
  return usersWithStats.sort((a, b) => {
    if (!a.last_activity) return 1;
    if (!b.last_activity) return -1;
    return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
  });
}

export async function getUserDetail(userId: string): Promise<UserDetail> {
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, company_name, role, created_at')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error("User not found");
  }

  // Get conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  // Get message counts for each conversation
  const conversationList: ConversationPreview[] = await Promise.all(
    (conversations || []).map(async (c: any) => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', c.id);

      return {
        id: c.id,
        title: c.title,
        message_count: count || 0,
        created_at: c.created_at,
        updated_at: c.updated_at,
      };
    })
  );

  // Get documents
  const { data: documents } = await supabase
    .from('files')
    .select('id, original_name, mime_type, supabase_path, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const documentList: DocumentPreview[] = (documents || []).map((d: any) => ({
    id: d.id,
    original_name: d.original_name,
    mime_type: d.mime_type,
    supabase_path: d.supabase_path,
    created_at: d.created_at,
  }));

  const profileDocuments = await getProfileDocuments(userId);

  // Get total message count
  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', (conversations || []).map((c: any) => c.id));

  return {
    user_id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    company_name: profile.company_name,
    role: profile.role,
    created_at: profile.created_at,
    total_conversations: conversationList.length,
    total_messages: totalMessages || 0,
    total_documents: documentList.length + profileDocuments.length,
    conversations: conversationList,
    documents: documentList,
    profile_documents: profileDocuments,
  };
}

export async function getConversationDetail(conversationId: string): Promise<ConversationDetail> {
  // Get conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    throw new Error("Conversation not found");
  }

  // Get messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  const messageList: MessageDetail[] = (messages || []).map((m: any) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    created_at: m.created_at,
  }));

  // Get documents attached to this conversation
  const { data: files } = await supabase
    .from("files")
    .select("id, original_name, mime_type, supabase_path, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });

  const documentList: DocumentPreview[] = (files || []).map((f: any) => ({
    id: f.id,
    original_name: f.original_name,
    mime_type: f.mime_type,
    supabase_path: f.supabase_path,
    created_at: f.created_at,
  }));

  return {
    id: conversation.id,
    title: conversation.title,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    messages: messageList,
    documents: documentList,
  };
}

export async function getFileViewUrl(supabasePath: string): Promise<string | null> {
  try {
    const response = await fetch("/api/files/view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: supabasePath }),
    });

    if (!response.ok) {
      console.error("Failed to request signed URL:", response.statusText);
      return null;
    }

    const payload = await response.json();
    return payload?.url ?? null;
  } catch (error) {
    console.error("Error requesting signed URL:", error);
    return null;
  }
}

export async function getProfileDocuments(userId: string): Promise<ProfileDocumentPreview[]> {
  try {
    const response = await fetch("/api/profile-docs/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      console.error("Failed to list profile documents:", response.statusText);
      return [];
    }

    const payload = await response.json();
    return (payload?.documents ?? []) as ProfileDocumentPreview[];
  } catch (error) {
    console.error("Error listing profile documents:", error);
    return [];
  }
}

export async function getProfileDocViewUrl(bucket: string, path: string): Promise<string | null> {
  try {
    const response = await fetch("/api/profile-docs/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, path }),
    });

    if (!response.ok) {
      console.error("Failed to request profile-doc signed URL:", response.statusText);
      return null;
    }

    const payload = await response.json();
    return payload?.url ?? null;
  } catch (error) {
    console.error("Error requesting profile-doc signed URL:", error);
    return null;
  }
}
