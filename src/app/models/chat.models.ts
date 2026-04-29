// ── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  color: string;
}

// ── Message ───────────────────────────────────────────────────────────────────
export type MessageType = 'msg' | 'sys';

export interface Message {
  id: string;
  senderId?: string;
  senderName?: string;
  senderColor?: string;
  text: string;
  at: string;   // ISO date string
  type: MessageType;
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export type ChatType = 'private' | 'group';

export interface ActiveChat {
  type: ChatType;
  id: string;          // userId for private, groupId for group
  name: string;
  color?: string;      // avatar color for private chat
  members?: string[];  // group member ids
}

// ── Group ─────────────────────────────────────────────────────────────────────
export interface Group {
  id: string;
  name: string;
  members: string[];   // userIds
  messages: Message[];
}

// ── Typing ────────────────────────────────────────────────────────────────────
export interface TypingEvent {
  chatKey: string;   // privateChatKey or groupId
  name: string;
  isTyping: boolean;
}

// ── Socket Payloads ───────────────────────────────────────────────────────────
export interface JoinResponse {
  user: User;
  users: User[];
  groups: Group[];
  error?: string;
}

export interface PrivateMessageEvent {
  fromUserId: string;
  message: Message;
}

export interface GroupMessageEvent {
  groupId: string;
  message: Message;
}

export interface GroupTypingEvent {
  groupId: string;
  fromUserId: string;
  fromName: string;
  isTyping: boolean;
}

export interface PrivateTypingEvent {
  fromUserId: string;
  fromName: string;
  isTyping: boolean;
}
