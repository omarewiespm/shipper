import { computed, inject, Injectable, signal } from '@angular/core';
import { RECEIVERS_API } from '../../core/data/receivers.api';
import { Receiver } from '../../models';

@Injectable({ providedIn: 'root' })
export class ReceiversStore {
  private readonly api = inject(RECEIVERS_API);

  private readonly _all = signal<Receiver[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly all = this._all.asReadonly();
  readonly byIdMap = computed(
    () => new Map(this._all().map((r) => [r.id, r])),
  );

  load(force = false): void {
    if (this._all().length && !force) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: (list) => {
        this._all.set(list);
        this.loading.set(false);
      },
      error: (e: { message?: string }) => {
        this.error.set(e?.message ?? 'Could not load receivers.');
        this.loading.set(false);
      },
    });
  }

  byId(id: string): Receiver | undefined {
    return this.byIdMap().get(id);
  }
}
