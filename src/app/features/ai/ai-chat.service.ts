import { Injectable, signal } from '@angular/core';

/** App-wide Madar AI chat drawer controller. */
@Injectable({ providedIn: 'root' })
export class AiChatService {
  readonly isOpen = signal(false);
  readonly seedPrompt = signal<string | null>(null);
  /** Bumped on each open so the drawer can reset its conversation. */
  readonly session = signal(0);

  open(prompt?: string): void {
    this.seedPrompt.set(prompt ?? null);
    this.session.update((v) => v + 1);
    this.isOpen.set(true);
  }
  close(): void {
    this.isOpen.set(false);
  }
}
