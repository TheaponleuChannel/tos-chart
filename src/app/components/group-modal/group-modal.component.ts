import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { User } from '../../models/chat.models';

@Component({
  selector: 'app-group-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-modal.component.html',
  styleUrls: ['./group-modal.component.scss'],
})
export class GroupModalComponent {
  @Output() close = new EventEmitter<void>();

  groupName = '';
  selectedIds = signal<Set<string>>(new Set());
  error = signal('');

  constructor(public chat: ChatService) {}

  get users(): User[] { return this.chat.onlineUsers(); }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  colorFor(name: string): string {
    const COLORS = ['#7c6ff7','#f472b6','#34d399','#fb923c','#60a5fa','#a78bfa','#f59e0b','#4fd1c5'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
    return COLORS[Math.abs(h) % COLORS.length];
  }

  toggleUser(userId: string): void {
    const set = new Set(this.selectedIds());
    if (set.has(userId)) set.delete(userId);
    else set.add(userId);
    this.selectedIds.set(set);
  }

  isSelected(userId: string): boolean {
    return this.selectedIds().has(userId);
  }

  async create(): Promise<void> {
    const name = this.groupName.trim();
    this.error.set('');
    if (!name) { this.error.set('Please enter a group name.'); return; }
    if (this.selectedIds().size === 0) { this.error.set('Select at least one member.'); return; }

    try {
      const group = await this.chat.createGroup(name, [...this.selectedIds()]);
      this.chat.openGroupChat(group);
      this.onClose();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Failed to create group.');
    }
  }

  onClose(): void {
    this.groupName = '';
    this.selectedIds.set(new Set());
    this.error.set('');
    this.close.emit();
  }
}
