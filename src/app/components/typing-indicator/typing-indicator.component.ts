import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-typing-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="typing-indicator" *ngIf="label">
      <div class="dots">
        <span></span><span></span><span></span>
      </div>
      <span class="label">{{ label }}</span>
    </div>
  `,
  styles: [`
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 20px 10px;
      min-height: 26px;
      font-size: 11px;
      color: var(--muted);
    }
    .dots {
      display: flex;
      gap: 3px;
      span {
        display: block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--muted);
        animation: bounce 1.2s infinite;
        &:nth-child(2) { animation-delay: 0.2s; }
        &:nth-child(3) { animation-delay: 0.4s; }
      }
    }
    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }
  `],
})
export class TypingIndicatorComponent {
  constructor(private chatService: ChatService) {}
  get label(): string { return this.chatService.typingLabel(); }
}
