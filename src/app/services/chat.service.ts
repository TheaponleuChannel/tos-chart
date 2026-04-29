import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import {
  ActiveChat,
  Group,
  Message,
  TypingEvent,
  User,
} from '../models/chat.models';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  private destroy$ = new Subject<void>();

  // ── Signals (Angular 18 reactive state) ─────────────────────────────────────
  readonly me = signal<User | null>(null);
  readonly onlineUsers = signal<User[]>([]);
  readonly groups = signal<Group[]>([]);
  readonly activeChat = signal<ActiveChat | null>(null);
  readonly messages = signal<Message[]>([]);
  readonly typingUsers = signal<Map<string, Set<string>>>(new Map());
  readonly unreadCounts = signal<Map<string, number>>(new Map());

  // ── Derived signals ──────────────────────────────────────────────────────────
  readonly typingLabel = computed(() => {
    const active = this.activeChat();
    if (!active) return '';
    const key = active.type === 'private'
      ? this.privateChatKey(active.id)
      : active.id;
    const names = [...(this.typingUsers().get(key) ?? [])];
    if (!names.length) return '';
    const who = names.length === 1
      ? names[0]
      : names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
    return `${who} ${names.length > 1 ? 'are' : 'is'} typing…`;
  });

  readonly totalUnread = computed(() =>
    [...this.unreadCounts().values()].reduce((a, b) => a + b, 0)
  );

  // ── In-memory chat store ─────────────────────────────────────────────────────
  private chatHistory = new Map<string, Message[]>();   // chatKey -> messages
  private typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private socket: SocketService) {}

  // ── Auth ─────────────────────────────────────────────────────────────────────
  async login(name: string): Promise<void> {
    this.socket.connect();
    const res = await this.socket.joinUser(name);
    this.me.set(res.user);
    this.onlineUsers.set(res.users);
    this.groups.set(res.groups ?? []);
    this.subscribeToEvents();
  }

  logout(): void {
    this.socket.disconnect();
    this.me.set(null);
    this.onlineUsers.set([]);
    this.groups.set([]);
    this.activeChat.set(null);
    this.messages.set([]);
    this.typingUsers.set(new Map());
    this.unreadCounts.set(new Map());
    this.chatHistory.clear();
    this.typingTimers.forEach(t => clearTimeout(t));
    this.typingTimers.clear();
    this.destroy$.next();
  }

  // ── Socket event subscriptions ───────────────────────────────────────────────
  private subscribeToEvents(): void {
    // Users list update (authoritative broadcast)
    this.socket.onUsersUpdate()
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.onlineUsers.set(users.filter(u => u.id !== this.me()?.id));
      });

    // Incoming private message
    this.socket.onPrivateMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ fromUserId, message }) => {
        const key = this.privateChatKey(fromUserId);
        this.addToHistory(key, message);
        const active = this.activeChat();
        if (active?.type === 'private' && active.id === fromUserId) {
          this.messages.update(msgs => [...msgs, message]);
        } else {
          this.incrementUnread(key);
        }
      });

    // Private typing
    this.socket.onPrivateTyping()
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ fromUserId, fromName, isTyping }) => {
        const key = this.privateChatKey(fromUserId);
        this.setTyping(key, fromName, isTyping);
      });

    // Group created (server broadcasts to all members)
    this.socket.onGroupCreated()
      .pipe(takeUntil(this.destroy$))
      .subscribe(group => {
        const already = this.groups().find(g => g.id === group.id);
        if (!already) {
          this.groups.update(gs => [...gs, group]);
          this.chatHistory.set(group.id, group.messages ?? []);
        }
      });

    // Group message
    this.socket.onGroupMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ groupId, message }) => {
        this.addToHistory(groupId, message);
        // Update group's message list
        this.groups.update(gs =>
          gs.map(g => g.id === groupId ? { ...g, messages: [...g.messages, message] } : g)
        );
        const active = this.activeChat();
        if (active?.type === 'group' && active.id === groupId) {
          this.messages.update(msgs => [...msgs, message]);
        } else {
          this.incrementUnread(groupId);
        }
      });

    // Group typing
    this.socket.onGroupTyping()
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ groupId, fromName, isTyping }) => {
        this.setTyping(groupId, fromName, isTyping);
      });
  }

  // ── Chat actions ──────────────────────────────────────────────────────────────
  async openPrivateChat(user: User): Promise<void> {
    const key = this.privateChatKey(user.id);
    this.activeChat.set({ type: 'private', id: user.id, name: user.name, color: user.color });
    this.clearUnread(key);

    // Load history (from cache or server)
    if (!this.chatHistory.has(key)) {
      const res = await this.socket.fetchPrivateHistory(user.id);
      this.chatHistory.set(key, res.messages);
    }
    this.messages.set([...(this.chatHistory.get(key) ?? [])]);
  }

  openGroupChat(group: Group): void {
    this.activeChat.set({
      type: 'group', id: group.id, name: group.name, members: group.members,
    });
    this.clearUnread(group.id);
    const history = this.chatHistory.get(group.id) ?? group.messages ?? [];
    this.chatHistory.set(group.id, history);
    this.messages.set([...history]);
  }

  closeChat(): void {
    this.activeChat.set(null);
    this.messages.set([]);
  }

  async sendMessage(text: string): Promise<void> {
    const active = this.activeChat();
    const me = this.me();
    if (!active || !me || !text.trim()) return;

    if (active.type === 'private') {
      const res = await this.socket.sendPrivateMessage(active.id, text);
      const key = this.privateChatKey(active.id);
      this.addToHistory(key, res.message);
      this.messages.update(msgs => [...msgs, res.message]);
    } else {
      const res = await this.socket.sendGroupMessage(active.id, text);
      this.addToHistory(active.id, res.message);
      this.messages.update(msgs => [...msgs, res.message]);
      this.groups.update(gs =>
        gs.map(g => g.id === active.id ? { ...g, messages: [...g.messages, res.message] } : g)
      );
    }
  }

  sendTyping(isTyping: boolean): void {
    const active = this.activeChat();
    if (!active) return;
    if (active.type === 'private') {
      this.socket.sendPrivateTyping(active.id, isTyping);
    } else {
      this.socket.sendGroupTyping(active.id, isTyping);
    }
  }

  async createGroup(name: string, memberIds: string[]): Promise<Group> {
    const res = await this.socket.createGroup(name, memberIds);
    // group:created event will add it; return for navigation
    return res.group;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  privateChatKey(otherId: string): string {
    const myId = this.me()!.id;
    return [myId, otherId].sort().join('__');
  }

  private addToHistory(key: string, msg: Message): void {
    if (!this.chatHistory.has(key)) this.chatHistory.set(key, []);
    this.chatHistory.get(key)!.push(msg);
  }

  private setTyping(chatKey: string, name: string, isTyping: boolean): void {
    const map = new Map(this.typingUsers());
    if (!map.has(chatKey)) map.set(chatKey, new Set());
    const set = new Set(map.get(chatKey)!);
    if (isTyping) {
      set.add(name);
      // Auto-clear after 3s
      const timerKey = `${chatKey}__${name}`;
      clearTimeout(this.typingTimers.get(timerKey));
      this.typingTimers.set(timerKey, setTimeout(() => {
        this.setTyping(chatKey, name, false);
      }, 3000));
    } else {
      set.delete(name);
    }
    map.set(chatKey, set);
    this.typingUsers.set(map);
  }

  private incrementUnread(key: string): void {
    const map = new Map(this.unreadCounts());
    map.set(key, (map.get(key) ?? 0) + 1);
    this.unreadCounts.set(map);
  }

  private clearUnread(key: string): void {
    const map = new Map(this.unreadCounts());
    map.delete(key);
    this.unreadCounts.set(map);
  }

  unreadFor(key: string): number {
    return this.unreadCounts().get(key) ?? 0;
  }

  lastMessageFor(key: string): Message | null {
    const msgs = this.chatHistory.get(key);
    return msgs?.length ? msgs[msgs.length - 1] : null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
