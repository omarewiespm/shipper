import { Injectable } from '@angular/core';

/**
 * Safe wrapper over localStorage (requirements §3/§9 — no direct localStorage
 * assumptions in shared code). Fails soft when storage is unavailable (SSR,
 * privacy mode) so callers never throw.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private get store(): Storage | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
      return null;
    }
  }

  get<T>(key: string, fallback: T): T {
    const raw = this.store?.getItem(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      this.store?.setItem(key, JSON.stringify(value));
    } catch {
      /* quota / unavailable — ignore */
    }
  }

  remove(key: string): void {
    try {
      this.store?.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
