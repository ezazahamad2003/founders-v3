export type ChatMode = "auto" | "chat" | "vision" | "files" | "deep_research";

export type PromptMode = "general" | "contract_review";

export interface UserProfile {
  id: string;
  email?: string | null;
  role: string;
  accepted_tos_at: string | null;
  full_name?: string | null;
  company_name?: string | null;
  website?: string | null;
  profile_image_path?: string | null;
}

export interface UpdateUserProfilePayload {
  full_name?: string | null;
  company_name?: string | null;
  website?: string | null;
  profile_image_path?: string | null;
}

export interface ProfileDocument {
  path: string;
  name: string;
  size: number;
  updatedAt?: string | null;
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

export type DebateModel = "openai" | "claude" | "synthesis";

export interface DebateTurnMessage {
  id: string;
  model: DebateModel;
  round: number;
  content: string;
  isStreaming?: boolean;
}

export interface DebateConsensusCheck {
  round: number;
  percentage: number;
  reached: boolean;
}

export interface DebateState {
  status: "idle" | "running" | "done" | "error";
  rounds: number;
  targetConsensus: number;
  currentRound: number;
  messages: DebateTurnMessage[];
  consensusHistory: DebateConsensusCheck[];
  synthesis: string;
  finalConsensus: number;
  errorMessage: string | null;
}

export interface DebateStreamHandlers {
  onDebateStart?: (targetConsensus: number) => void;
  onRoundStart?: (round: number) => void;
  onModelTurnStart?: (model: DebateModel, round: number) => void;
  onToken?: (model: DebateModel, delta: string) => void;
  onModelTurnEnd?: (model: DebateModel, round: number, content: string) => void;
  onConsensusCheck?: (round: number, percentage: number, reached: boolean) => void;
  onSynthesisStart?: () => void;
  onDone?: (
    roundsCompleted: number,
    finalConsensus: number,
    synthesis: string,
    conversationId?: string,
    messageId?: string,
  ) => void;
  onError?: (error: Error) => void;
}

