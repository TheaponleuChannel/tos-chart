import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from './services/chat.service';
import { LoginComponent } from './components/login/login.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { GroupModalComponent } from './components/group-modal/group-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    LoginComponent,
    SidebarComponent,
    ChatWindowComponent,
    GroupModalComponent,
  ],
  template: `
    <app-login *ngIf="!isLoggedIn()"></app-login>

    <div class="chat-layout" *ngIf="isLoggedIn()">
      <app-sidebar (openGroupModal)="showGroupModal.set(true)"></app-sidebar>
      <app-chat-window></app-chat-window>
    </div>

    <app-group-modal
      *ngIf="showGroupModal()"
      (close)="showGroupModal.set(false)"
    ></app-group-modal>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .chat-layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
  `],
})
export class AppComponent {
  showGroupModal = signal(false);

  constructor(private chat: ChatService) {}

  isLoggedIn(): boolean {
    return this.chat.me() !== null;
  }
}
