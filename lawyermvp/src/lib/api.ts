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
  const res = await fetch('/api/data/users');
  if (!res.ok) return [];
  const users: UserStats[] = await res.json();

  // Merge profile-library document counts (fetched via separate Storage API)
  const enriched = await Promise.all(
    users.map(async (u) => {
      const profileDocs = await getProfileDocuments(u.user_id);
      return { ...u, total_documents: u.total_documents + profileDocs.length };
    })
  );

  return enriched;
}

export async function getUserDetail(userId: string): Promise<UserDetail> {
  const res = await fetch('/api/data/users/detail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    throw new Error('User not found');
  }

  const data = await res.json();

  const profileDocuments = await getProfileDocuments(userId);

  return {
    ...data,
    total_documents: data.total_documents + profileDocuments.length,
    profile_documents: profileDocuments,
  };
}

export async function getConversationDetail(conversationId: string): Promise<ConversationDetail> {
  const res = await fetch('/api/data/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId }),
  });

  if (!res.ok) {
    throw new Error('Conversation not found');
  }

  return res.json();
}

export async function getFileViewUrl(supabasePath: string): Promise<string | null> {
  try {
    const response = await fetch('/api/files/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: supabasePath }),
    });

    if (!response.ok) {
      console.error('Failed to request signed URL:', response.statusText);
      return null;
    }

    const payload = await response.json();
    return payload?.url ?? null;
  } catch (error) {
    console.error('Error requesting signed URL:', error);
    return null;
  }
}

export async function getProfileDocuments(userId: string): Promise<ProfileDocumentPreview[]> {
  try {
    const response = await fetch('/api/profile-docs/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      console.error('Failed to list profile documents:', response.statusText);
      return [];
    }

    const payload = await response.json();
    return (payload?.documents ?? []) as ProfileDocumentPreview[];
  } catch (error) {
    console.error('Error listing profile documents:', error);
    return [];
  }
}

export async function getProfileDocViewUrl(bucket: string, path: string): Promise<string | null> {
  try {
    const response = await fetch('/api/profile-docs/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, path }),
    });

    if (!response.ok) {
      console.error('Failed to request profile-doc signed URL:', response.statusText);
      return null;
    }

    const payload = await response.json();
    return payload?.url ?? null;
  } catch (error) {
    console.error('Error requesting profile-doc signed URL:', error);
    return null;
  }
}
