import { Injectable, OnDestroy } from '@angular/core';
import { Observable, fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import {
  GroupMessageEvent,
  GroupTypingEvent,
  PrivateMessageEvent,
  PrivateTypingEvent,
  User,
} from '../models/chat.models';

const SOCKET_URL = 'https://chat-server-nwv6.onrender.com';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket!: Socket;
  private destroy$ = new Subject<void>();

  // ── Connection ──────────────────────────────────────────────────────────────
  connect(): void {
    if (this.socket?.connected) return;
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }

  disconnect(): void {
    this.socket?.emit('user:logout');
    this.socket?.disconnect();
  }

  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  // ── Emit helpers ────────────────────────────────────────────────────────────
  emit<T = unknown>(event: string, data?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      this.socket.emit(event, data, (res: T & { error?: string }) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  // ── Listen helpers (RxJS) ───────────────────────────────────────────────────
  on<T>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      const handler = (data: T) => observer.next(data);
      this.socket.on(event, handler);
      return () => this.socket.off(event, handler);
    }).pipe(takeUntil(this.destroy$));
  }

  // ── User events ─────────────────────────────────────────────────────────────
  onUserJoined(): Observable<User> {
    return this.on<User>('user:joined');
  }

  onUserLeft(): Observable<{ id: string; name: string }> {
    return this.on<{ id: string; name: string }>('user:left');
  }

  onUsersUpdate(): Observable<User[]> {
    return this.on<User[]>('users:update');
  }

  // ── Private chat events ─────────────────────────────────────────────────────
  onPrivateMessage(): Observable<PrivateMessageEvent> {
    return this.on<PrivateMessageEvent>('private:message');
  }

  onPrivateTyping(): Observable<PrivateTypingEvent> {
    return this.on<PrivateTypingEvent>('private:typing');
  }

  // ── Group events ────────────────────────────────────────────────────────────
  onGroupCreated(): Observable<import('../models/chat.models').Group> {
    return this.on<import('../models/chat.models').Group>('group:created');
  }

  onGroupMessage(): Observable<GroupMessageEvent> {
    return this.on<GroupMessageEvent>('group:message');
  }

  onGroupTyping(): Observable<GroupTypingEvent> {
    return this.on<GroupTypingEvent>('group:typing');
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  joinUser(name: string) {
    return this.emit<import('../models/chat.models').JoinResponse>('user:join', { name });
  }

  sendPrivateMessage(toUserId: string, text: string) {
    return this.emit<{ message: import('../models/chat.models').Message }>(
      'private:message', { toUserId, text }
    );
  }

  sendPrivateTyping(toUserId: string, isTyping: boolean) {
    this.socket.emit('private:typing', { toUserId, isTyping });
  }

  fetchPrivateHistory(withUserId: string) {
    return this.emit<{ messages: import('../models/chat.models').Message[] }>(
      'private:history', { withUserId }
    );
  }

  createGroup(name: string, memberIds: string[]) {
    return this.emit<{ group: import('../models/chat.models').Group }>(
      'group:create', { name, memberIds }
    );
  }

  sendGroupMessage(groupId: string, text: string) {
    return this.emit<{ message: import('../models/chat.models').Message }>(
      'group:message', { groupId, text }
    );
  }

  sendGroupTyping(groupId: string, isTyping: boolean) {
    this.socket.emit('group:typing', { groupId, isTyping });
  }

  fetchGroupHistory(groupId: string) {
    return this.emit<{ messages: import('../models/chat.models').Message[] }>(
      'group:history', { groupId }
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
