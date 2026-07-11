import { Injectable, signal } from '@angular/core';

export type PanelId = 'notifications' | 'messages' | 'support';

/** Controls the sidebar utility drawers (one open at a time). */
@Injectable({ providedIn: 'root' })
export class SidePanelService {
  readonly active = signal<PanelId | null>(null);

  open(id: PanelId): void {
    this.active.set(id);
  }
  close(): void {
    this.active.set(null);
  }
  isOpen(id: PanelId): boolean {
    return this.active() === id;
  }
}
