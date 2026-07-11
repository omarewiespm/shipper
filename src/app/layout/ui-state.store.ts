import { Injectable, signal } from '@angular/core';

/**
 * Shell UI state. The sidebar is fixed on desktop; on mobile it becomes an
 * off-canvas drawer toggled by `mobileNavOpen`.
 */
@Injectable({ providedIn: 'root' })
export class UiStateStore {
  readonly mobileNavOpen = signal(false);

  toggleMobileNav(open?: boolean): void {
    this.mobileNavOpen.update((v) => (open === undefined ? !v : open));
  }
}
