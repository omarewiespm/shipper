import { Injectable, signal } from '@angular/core';

/**
 * Coordinates popovers/menus app-wide so only one is open at a time — opening
 * one (header app hub, account menu, a table row's ⋮ menu) closes the others.
 * Each menu registers under a unique id.
 */
@Injectable({ providedIn: 'root' })
export class MenuStateService {
  private readonly openId = signal<string | null>(null);

  isOpen(id: string): boolean {
    return this.openId() === id;
  }

  toggle(id: string): void {
    this.openId.update((cur) => (cur === id ? null : id));
  }

  close(id?: string): void {
    if (!id || this.openId() === id) this.openId.set(null);
  }
}
