import { Component, computed, signal, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { User, Group } from '../../models/chat.models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  @Output() openGroupModal = new EventEmitter<void>();

  constructor(public chat: ChatService) {}

  get me() { return this.chat.me(); }
  get onlineUsers() { return this.chat.onlineUsers(); }
  get groups() { return this.chat.groups(); }
  get activeChat() { return this.chat.activeChat(); }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  colorFor(name: string): string {
    const COLORS = ['#7c6ff7','#f472b6','#34d399','#fb923c','#60a5fa','#a78bfa','#f59e0b','#4fd1c5'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
    return COLORS[Math.abs(h) % COLORS.length];
  }

  unreadFor(key: string): number {
    return this.chat.unreadFor(key);
  }

  lastMessage(key: string): string {
    const msg = this.chat.lastMessageFor(key);
    if (!msg || msg.type === 'sys') return '';
    return msg.text.length > 28 ? msg.text.slice(0, 28) + '…' : msg.text;
  }

  privateKey(userId: string): string {
    return this.chat.privateChatKey(userId);
  }

  isActivePrivate(userId: string): boolean {
    const a = this.activeChat;
    return a?.type === 'private' && a.id === userId;
  }

  isActiveGroup(groupId: string): boolean {
    const a = this.activeChat;
    return a?.type === 'group' && a.id === groupId;
  }

  selectUser(user: User): void {
    this.chat.openPrivateChat(user);
  }

  selectGroup(group: Group): void {
    this.chat.openGroupChat(group);
  }

  groupMemberNames(group: Group): string {
    return group.members
      .map(id => this.onlineUsers.find(u => u.id === id)?.name ?? 'Unknown')
      .join(', ');
  }

  logout(): void {
    this.chat.logout();
  }
}
