export type ApiResponse<T> = { success: boolean; message?: string; data: T };

export type UserChat = {
  id: number;
  name: string;
  email: string;
  is_online: boolean;
  last_seen_at: string | null;
};

export type Sender = { id: number; name: string; email: string };

export type Message = {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string;
  created_at: string;
  sender?: Sender;
};

export type Participant = {
  id: number;
  user_id: number;
  last_read_at: string | null;
  user?: Sender;
};

export type Conversation = {
  id: number;
  type: string;
  direct_hash?: string | null;
  participants?: Participant[];
  lastMessage?: Message | null;
  last_message?: Message | null;

  // ✅ si backend lo manda (recomendado)
  unread_count?: number;
};
