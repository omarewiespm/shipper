import { computed, inject, Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

const TOKEN_KEY = 'madar.session';

/**
 * Session state. Access token is held in memory (persisted here as a mock
 * stand-in for the httpOnly refresh cookie). `firstRun` flags a fresh signup so
 * Home can wear its onboarding coat.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly storage = inject(StorageService);
  private readonly token = signal<string | null>(this.storage.get<string | null>(TOKEN_KEY, null));

  readonly isAuthenticated = computed(() => !!this.token());
  readonly firstRun = signal(false);
  readonly displayName = signal('there');
  readonly companyName = signal('Rawabi Trading Co.');

  signIn(token: string, opts?: { firstRun?: boolean; name?: string; company?: string }): void {
    this.token.set(token);
    this.storage.set(TOKEN_KEY, token);
    if (opts?.firstRun) this.firstRun.set(true);
    if (opts?.name) this.displayName.set(opts.name);
    if (opts?.company) this.companyName.set(opts.company);
  }

  signOut(): void {
    this.token.set(null);
    this.firstRun.set(false);
    this.storage.remove(TOKEN_KEY);
  }
}
