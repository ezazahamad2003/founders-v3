import { ChatRequestPayload, ConversationDetailResponse, ConversationSummary, FileMeta, RegisterFileInput, UserProfile } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  console.warn("NEXT_PUBLIC_API_BASE_URL is not defined. Backend requests will fail.");
}

interface StreamHandlers {
  onToken?: (delta: string) => void;
  onDone?: (payload: { event: "done"; conversation_id: string; message_id: string }) => void;
  onError?: (error: Error) => void;
}

async function apiFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options?.headers as Record<string, string> ?? {}),
  };

  // Only set Content-Type for requests with JSON bodies
  if (options?.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const detail = await safeParse(response);
    const errorMessage = detail?.detail ?? response.statusText;
    throw new Error(errorMessage || "Request failed");
  }

  // 204 No Content responses have no body to parse
  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

async function safeParse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function getMe(token: string) {
  return apiFetch<UserProfile>("/api/me", token);
}

export function acceptTos(token: string) {
  return apiFetch<UserProfile>("/api/accept-tos", token, { method: "POST", body: "{}" });
}

export function listConversations(token: string) {
  return apiFetch<{ conversations: ConversationSummary[] }>("/api/conversations", token);
}

export function getConversation(token: string, conversationId: string) {
  return apiFetch<ConversationDetailResponse>(`/api/conversations/${conversationId}`, token);
}

export function deleteConversation(token: string, conversationId: string) {
  return apiFetch<void>(`/api/conversations/${conversationId}`, token, {
    method: "DELETE",
  });
}

export function registerConversationFiles(token: string, conversationId: string | null, files: RegisterFileInput[]) {
  return apiFetch<{ files: FileMeta[] }>("/api/files/register", token, {
    method: "POST",
    body: JSON.stringify({
      conversation_id: conversationId,
      files,
    }),
  });
}

/**
 * NEW: Upload file using OpenAI Files API first, then Supabase
 * This replaces the old flow of uploading to Supabase first
 */
export async function uploadFile(token: string, file: File, conversationId: string | null): Promise<FileMeta> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured.");
  }

  const formData = new FormData();
  formData.append("file", file);
  if (conversationId) {
    formData.append("conversation_id", conversationId);
  }

  const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type - browser will set it with boundary for multipart/form-data
    },
    body: formData,
  });

  if (!response.ok) {
    const detail = await safeParse(response);
    const errorMessage = detail?.detail ?? response.statusText;
    throw new Error(errorMessage || "File upload failed");
  }

  return (await response.json()) as FileMeta;
}

export async function streamChat(
  token: string,
  payload: ChatRequestPayload,
  handlers: StreamHandlers,
) {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    const detail = await safeParse(response);
    throw new Error(detail?.detail ?? response.statusText ?? "Unable to start chat stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) continue;

        try {
          const event = JSON.parse(line);
          if (event.event === "token") {
            handlers.onToken?.(event.delta ?? "");
          } else if (event.event === "done") {
            handlers.onDone?.(event);
          }
        } catch (error) {
          console.error("Failed to parse stream chunk", error);
        }
      }
    }
  } catch (error) {
    handlers.onError?.(error as Error);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

