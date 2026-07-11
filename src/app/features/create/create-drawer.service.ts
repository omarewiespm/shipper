import { Injectable, signal } from '@angular/core';

/** Controls the global Create-shipment drawer (opened from the sidebar CTA & lists). */
@Injectable({ providedIn: 'root' })
export class CreateDrawerService {
  readonly isOpen = signal(false);
  /** Bumped on each open so the drawer can reset its form. */
  readonly session = signal(0);
  /** Which tab the drawer should open on. */
  readonly initialTab = signal<'create' | 'bulk'>('create');

  open(tab: 'create' | 'bulk' = 'create'): void {
    this.initialTab.set(tab);
    this.session.update((v) => v + 1);
    this.isOpen.set(true);
  }
  close(): void {
    this.isOpen.set(false);
  }
}
