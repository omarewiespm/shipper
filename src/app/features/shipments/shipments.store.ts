import { computed, inject, Injectable, signal } from '@angular/core';
import { SHIPMENTS_API } from '../../core/data/shipments.api';
import { Shipment } from '../../models';

const ACTIVE_STATUSES = new Set<Shipment['status']>([
  'posted', 'accepted', 'driver_accepted', 'at_pickup', 'loaded', 'in_transit', 'arrived',
]);

/** A delivered shipment is "signed off" once it has a signed delivery note/POD. */
export function isSignedOff(s: Shipment): boolean {
  return s.documents.some(
    (d) => (d.type === 'delivery_note' || d.type === 'pod') && !!d.signedAt,
  );
}

/**
 * Signal store for shipments (requirements §3). Loads once, derives the tab
 * buckets and attention counts everything else reads.
 */
@Injectable({ providedIn: 'root' })
export class ShipmentsStore {
  private readonly api = inject(SHIPMENTS_API);

  private readonly _all = signal<Shipment[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly all = this._all.asReadonly();

  readonly active = computed(() =>
    this._all().filter((s) => ACTIVE_STATUSES.has(s.status)),
  );
  readonly delivered = computed(() =>
    this._all().filter((s) => s.status === 'delivered' || s.status === 'completed'),
  );
  readonly awaitingSignOff = computed(() =>
    this._all().filter((s) => s.status === 'delivered' && !isSignedOff(s)),
  );
  readonly drafts = computed(() =>
    this._all().filter((s) => s.status === 'draft'),
  );

  readonly attentionCount = computed(() => this.awaitingSignOff().length);

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
        this.error.set(e?.message ?? 'Could not load shipments.');
        this.loading.set(false);
      },
    });
  }

  byId(id: string): Shipment | undefined {
    return this._all().find((s) => s.id === id);
  }
}
