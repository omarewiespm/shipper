import { computed, inject, Injectable, signal } from '@angular/core';
import { HOME_API, HomeSnapshot } from '../../core/data/home.api';

/** Signal store for the Home (reporting) page. Loads one snapshot. */
@Injectable({ providedIn: 'root' })
export class HomeStore {
  private readonly api = inject(HOME_API);

  private readonly _snapshot = signal<HomeSnapshot | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly snapshot = this._snapshot.asReadonly();
  readonly attention = computed(() => this._snapshot()?.attention ?? null);
  readonly status = computed(() => this._snapshot()?.status ?? null);
  readonly volume = computed(() => this._snapshot()?.volume ?? null);
  readonly spend = computed(() => this._snapshot()?.spend ?? null);
  readonly onTime = computed(() => this._snapshot()?.onTime ?? null);
  readonly lanes = computed(() => this._snapshot()?.lanes ?? []);
  readonly receivers = computed(() => this._snapshot()?.receivers ?? []);

  load(force = false): void {
    if (this._snapshot() && !force) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.get().subscribe({
      next: (snap) => {
        this._snapshot.set(snap);
        this.loading.set(false);
      },
      error: (e: { message?: string }) => {
        this.error.set(e?.message ?? 'Could not load your dashboard.');
        this.loading.set(false);
      },
    });
  }
}
