export type User = {
  id: number; username: string; display_name: string; bio: string;
  avatar_url: string; online: boolean; last_seen: string | null;
};
export type Message = {
  id: string; sender: User; text: string; attachment_name: string;
  attachment_url: string | null; client_nonce: string | null; created_at: string;
  edited_at: string | null; deleted_at: string | null;
};
export type Conversation = {
  id: string; kind: 'direct' | 'group'; title: string; display_title: string;
  participants: User[]; last_message: Message | null; unread_count: number;
  read_states: { user_id: number; last_read_at: string | null }[];
  created_at: string; updated_at: string;
};
export type Session = { access: string; refresh: string; user: User };
export type MessagePage = { items: Message[]; has_more: boolean; next_cursor: string | null };
export type SocketEvent =
  | { type: 'connected'; user_id: number }
  | { type: 'pong' }
  | { type: 'conversation.created'; id: string }
  | { type: 'conversation.updated'; id: string; title: string }
  | { type: 'conversation.read'; conversation_id: string; user_id: number }
  | { type: 'message.created' | 'message.updated'; conversation_id: string; message: Message }
  | { type: 'typing' | 'typing.stop'; conversation_id: string; user_id: number }
  | { type: 'presence'; user_id: number; online: boolean }
  | { type: 'error'; detail: string };
