import {
  Component, ElementRef, ViewChild, AfterViewChecked,
  OnDestroy, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { TypingIndicatorComponent } from '../typing-indicator/typing-indicator.component';
import { Message } from '../../models/chat.models';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, TypingIndicatorComponent],
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.scss'],
})
export class ChatWindowComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('messagesEl') messagesEl!: ElementRef<HTMLDivElement>;

  messageText = '';
  private typingTimeout?: ReturnType<typeof setTimeout>;
  private lastScrollHeight = 0;

  constructor(public chat: ChatService) {}

  get active() { return this.chat.activeChat(); }
  get messages() { return this.chat.messages(); }
  get me() { return this.chat.me(); }

  get headerSub(): string {
    const a = this.active;
    if (!a) return '';
    if (a.type === 'private') return '● Online · Private chat';
    const members = a.members
      ?.map(id => this.chat.onlineUsers().find(u => u.id === id)?.name ?? 'Unknown')
      .join(', ') ?? '';
    return `${(a.members?.length ?? 0) + 1} members · ${members}`;
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  colorFor(name: string): string {
    const COLORS = ['#7c6ff7','#f472b6','#34d399','#fb923c','#60a5fa','#a78bfa','#f59e0b','#4fd1c5'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
    return COLORS[Math.abs(h) % COLORS.length];
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  isSelf(msg: Message): boolean {
    return msg.senderId === this.me?.id;
  }

  showAvatar(msgs: Message[], index: number): boolean {
    const msg = msgs[index];
    if (this.isSelf(msg) || msg.type === 'sys') return false;
    const prev = msgs[index - 1];
    return !prev || prev.senderId !== msg.senderId || prev.type === 'sys';
  }

  showSenderName(msgs: Message[], index: number): boolean {
    return (
      this.active?.type === 'group' &&
      !this.isSelf(msgs[index]) &&
      this.showAvatar(msgs, index)
    );
  }

  onTyping(): void {
    this.chat.sendTyping(true);
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.chat.sendTyping(false);
    }, 2000);
  }

  async sendMessage(): Promise<void> {
    const text = this.messageText.trim();
    if (!text) return;
    this.messageText = '';
    clearTimeout(this.typingTimeout);
    this.chat.sendTyping(false);
    await this.chat.sendMessage(text);
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  ngAfterViewChecked(): void {
    const el = this.messagesEl?.nativeElement;
    if (el && el.scrollHeight !== this.lastScrollHeight) {
      el.scrollTop = el.scrollHeight;
      this.lastScrollHeight = el.scrollHeight;
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.typingTimeout);
  }
}
