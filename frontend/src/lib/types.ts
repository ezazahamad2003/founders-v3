export type ChatMode = "auto" | "chat" | "vision" | "files" | "deep_research";

export type PromptMode = "general" | "contract_review";

export interface UserProfile {
  id: string;
  email?: string | null;
  role: string;
  accepted_tos_at: string | null;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  assigned_lawyer_id: string | null;
}

export interface ConversationDetail {
  id: string;
  user_id: string;
  assigned_lawyer_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface FileMeta {
  id: string;
  conversation_id: string;
  supabase_path: string;
  mime_type: string | null;
  original_name: string | null;
  created_at: string;
}

export interface RegisterFileInput {
  supabase_path: string;
  mime_type?: string | null;
  original_name?: string | null;
}

export interface ChatRequestPayload {
  conversation_id: string | null;
  message: string;
  file_ids?: string[] | null;
  mode: ChatMode;
  prompt_mode?: PromptMode;
}

export interface ConversationDetailResponse {
  conversation: ConversationDetail;
  messages: Message[];
  files: FileMeta[];
}

