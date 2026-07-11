import { computed, inject, Injectable, signal } from '@angular/core';
import { Partner, PARTNERS_API, PartnerRelationship } from '../../core/data/partners.api';

export type RelFilter = 'all' | 'customer' | 'supplier';

/** Partners directory store — companies you trade with (customers & suppliers). */
@Injectable({ providedIn: 'root' })
export class PartnersStore {
  private readonly api = inject(PARTNERS_API);

  private readonly _all = signal<Partner[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly query = signal('');
  readonly rel = signal<RelFilter>('all');

  readonly all = this._all.asReadonly();

  byId(id: string): Partner | undefined {
    return this._all().find((p) => p.id === id);
  }

  private readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const rel = this.rel();
    return this._all().filter((p) => {
      if (rel !== 'all' && p.relationship !== rel && p.relationship !== 'both') return false;
      return !q || `${p.name} ${p.city} ${p.contactName}`.toLowerCase().includes(q);
    });
  });

  /** All partners in the directory (on-Madar + invited/pending), filtered. */
  readonly directory = computed(() => this.filtered());
  readonly onMadar = computed(() => this.filtered().filter((p) => p.madarStatus === 'active'));
  readonly pending = computed(() => this.filtered().filter((p) => p.madarStatus !== 'active'));

  readonly counts = computed(() => ({
    total: this._all().length,
    active: this._all().filter((p) => p.madarStatus === 'active').length,
    pending: this._all().filter((p) => p.madarStatus !== 'active').length,
    customers: this._all().filter((p) => p.relationship !== 'supplier').length,
    suppliers: this._all().filter((p) => p.relationship !== 'customer').length,
  }));

  load(force = false): void {
    if (this._all().length && !force) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: (list) => { this._all.set(list); this.loading.set(false); },
      error: (e: { message?: string }) => { this.error.set(e?.message ?? 'Could not load partners.'); this.loading.set(false); },
    });
  }

  invite(id: string): void {
    this._all.update((list) => list.map((p) =>
      p.id === id ? { ...p, madarStatus: 'invited', lastActivity: 'Invited just now' } : p));
  }

  add(input: { name: string; relationship: PartnerRelationship; city: string; contactName: string; contactPhone: string; contactEmail: string; invite: boolean }): void {
    const id = `PTR-${String(this._all().length + 1).padStart(3, '0')}`;
    this._all.update((list) => [{
      id,
      name: input.name,
      relationship: input.relationship,
      madarStatus: input.invite ? 'invited' : 'not_invited',
      city: input.city,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      shipments: 0, onTimePct: 0, openPos: 0,
      lastActivity: input.invite ? 'Invited just now' : 'Added just now',
    }, ...list]);
  }
}
