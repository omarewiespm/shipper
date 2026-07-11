import { computed, inject, Injectable, signal } from '@angular/core';
import { INVOICES_API } from '../../core/data/invoices.api';
import { Invoice, InvoiceStatus } from '../../models';

export type InvStatusFilter = 'all' | InvoiceStatus;

export function invoiceChip(s: InvoiceStatus): { label: string; tone: 'ok' | 'warn' | 'danger' } {
  switch (s) {
    case 'paid': return { label: 'Paid', tone: 'ok' };
    case 'overdue': return { label: 'Overdue', tone: 'danger' };
    default: return { label: 'Due', tone: 'warn' };
  }
}

function invHash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
/** Decompose the invoice total into amount + waiting charge + VAT. */
export function invoiceBill(inv: Invoice): { amount: number; waiting: number; vat: number; total: number } {
  const total = inv.amount.amount;
  const subtotal = Math.round(total / 1.15);
  const vat = total - subtotal;
  const waiting = invHash(inv.id) % 2 === 0 ? Math.round(subtotal * 0.08) : 0;
  return { amount: subtotal - waiting, waiting, vat, total };
}

/** Invoices store — freight invoices with due / overdue / paid states. */
@Injectable({ providedIn: 'root' })
export class InvoicesStore {
  private readonly api = inject(INVOICES_API);

  private readonly _all = signal<Invoice[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly query = signal('');
  readonly statusFilter = signal<InvStatusFilter>('all');
  readonly all = this._all.asReadonly();

  readonly outstanding = computed(() =>
    this._all().filter((i) => i.status === 'due' || i.status === 'overdue'),
  );

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const s = this.statusFilter();
    return this._all().filter((inv) => {
      if (s !== 'all' && inv.status !== s) return false;
      return !q || `${inv.id} ${inv.shipmentId}`.toLowerCase().includes(q);
    });
  });

  readonly counts = computed(() => {
    const a = this._all();
    return {
      all: a.length,
      due: a.filter((i) => i.status === 'due').length,
      overdue: a.filter((i) => i.status === 'overdue').length,
      paid: a.filter((i) => i.status === 'paid').length,
    };
  });

  readonly totals = computed(() => {
    const a = this._all();
    const sum = (pred: (i: Invoice) => boolean) => a.filter(pred).reduce((t, i) => t + i.amount.amount, 0);
    return {
      outstanding: sum((i) => i.status !== 'paid'),
      overdue: sum((i) => i.status === 'overdue'),
      overdueCount: a.filter((i) => i.status === 'overdue').length,
      paid: sum((i) => i.status === 'paid'),
    };
  });

  load(force = false): void {
    if (this._all().length && !force) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: (list) => { this._all.set(list); this.loading.set(false); },
      error: (e: { message?: string }) => { this.error.set(e?.message ?? 'Could not load invoices.'); this.loading.set(false); },
    });
  }

  byId(id: string): Invoice | undefined { return this._all().find((i) => i.id === id); }

  markPaid(id: string): void {
    this._all.update((list) => list.map((i) => (i.id === id ? { ...i, status: 'paid' } : i)));
  }
}
