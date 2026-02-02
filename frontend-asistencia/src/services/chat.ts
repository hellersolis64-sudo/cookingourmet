// src/services/chat.ts
import { api } from "./api";
import type { ApiResponse, Conversation, Message, UserChat } from "../types/chat";

export async function pingPresence() {
  await api.post("/presence/ping");
}

export async function getChatUsers(search?: string): Promise<UserChat[]> {
  const res = await api.get<ApiResponse<UserChat[]>>("/usuarios-chat", {
    params: search?.trim() ? { search: search.trim() } : undefined,
  });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function listConversations(): Promise<Conversation[]> {
  const res = await api.get<ApiResponse<Conversation[]>>("/conversations");
  const items = res.data?.data;
  return Array.isArray(items) ? items : [];
}

export async function getOrCreateDirectConversation(userId: number): Promise<Conversation> {
  const res = await api.post<ApiResponse<Conversation>>("/conversations/direct", { user_id: userId });
  if (!res.data?.data) throw new Error("No se pudo crear conversación");
  return res.data.data;
}

/** Helper defensivo: intenta sacar el sender id aunque el backend cambie el nombre */
export function getMessageSenderId(m: any): number {
  const v = m?.sender_id ?? m?.user_id ?? m?.from_id ?? m?.sender?.id ?? 0;
  return Number(v || 0);
}

/** Normaliza para que siempre tengas sender_id (útil para tu UI) */
function normalizeMessage(m: any): any {
  if (!m) return m;
  if (m.sender_id == null) {
    const sid = getMessageSenderId(m);
    return { ...m, sender_id: sid };
  }
  return m;
}

/**
 * Mensajes en orden ascendente (viejo -> nuevo).
 * - Pide order=asc (si el backend lo ignora, igual)
 * - Fallback: ordena por created_at para que el scroll sea estable.
 */
export async function getMessages(conversationId: number): Promise<Message[]> {
  const res = await api.get<ApiResponse<Message[]>>(`/conversations/${conversationId}/messages`, {
    params: { order: "asc" },
  });

  const items = Array.isArray(res.data?.data) ? res.data.data : [];
  const norm = items.map(normalizeMessage);

  const sorted = [...norm].sort((a: any, b: any) => {
    const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });

  return sorted as Message[];
}

export async function sendMessage(conversationId: number, body: string): Promise<Message> {
  const res = await api.post<ApiResponse<Message>>(`/conversations/${conversationId}/messages`, { body });
  if (!res.data?.data) throw new Error("No se pudo enviar");
  return normalizeMessage(res.data.data) as Message;
}

export async function markRead(conversationId: number) {
  try {
    await api.post(`/conversations/${conversationId}/read`);
  } catch {
    // ignore
  }
}

/**
 * ✅ Typing (si tu backend lo soporta)
 * Rutas esperadas (puedes ajustarlas):
 * - POST /typing/start { conversation_id }
 * - POST /typing/stop  { conversation_id }
 *
 * Si tu backend usa otra ruta, me dices y lo adapto.
 */
export async function typingStart(conversationId: number) {
  try {
    await api.post("/typing/start", { conversation_id: conversationId });
  } catch {
    // ignore
  }
}

export async function typingStop(conversationId: number) {
  try {
    await api.post("/typing/stop", { conversation_id: conversationId });
  } catch {
    // ignore
  }
}
