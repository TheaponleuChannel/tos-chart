import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  username = '';
  error = signal('');
  loading = signal(false);

  constructor(private chat: ChatService) {}

  async onSubmit(): Promise<void> {
    const name = this.username.trim();
    this.error.set('');

    if (!name) { this.error.set('Please enter a username.'); return; }
    if (name.length < 2) { this.error.set('Username must be at least 2 characters.'); return; }
    if (!/^[a-zA-Z0-9_\- ]+$/.test(name)) {
      this.error.set('Only letters, numbers, spaces, _ and - are allowed.');
      return;
    }

    this.loading.set(true);
    try {
      await this.chat.login(name);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to connect. Is the server running?');
      this.loading.set(false);
    }
  }
}
