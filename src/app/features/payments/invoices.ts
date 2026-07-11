import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Invoice } from '../../models';
import { Button, FilterDropdown, Icon, StatusChip } from '../../shared/ui';
import { downloadCsv } from '../shipments/csv';
import { InvoiceActionsMenu } from './invoice-actions-menu';
import { InvStatusFilter, InvoicesStore, invoiceChip } from './invoices.store';
import { PayInvoiceDrawer } from './pay-invoice-drawer';

const PAGE_SIZE = 10;

/** Invoices — a table of freight invoices with due / overdue / paid states. */
@Component({
  selector: 'app-invoices',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusChip, Button, FilterDropdown, InvoiceActionsMenu, PayInvoiceDrawer],
  templateUrl: './invoices.html',
  styleUrl: './invoices.scss',
})
export class Invoices implements OnInit {
  protected readonly store = inject(InvoicesStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly payInvoice = signal<Invoice | null>(null);

  protected readonly statusFilters: { key: InvStatusFilter; label: string }[] = [
    { key: 'all', label: 'All invoices' },
    { key: 'due', label: 'Due' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'paid', label: 'Paid' },
  ];
  protected readonly statusLabel = computed(() => this.statusFilters.find((f) => f.key === this.store.statusFilter())?.label ?? 'All invoices');
  protected statusCount(key: InvStatusFilter): number {
    const c = this.store.counts();
    return key === 'all' ? c.all : c[key];
  }

  // Pagination
  protected readonly page = signal(1);
  protected readonly total = computed(() => this.store.filtered().length);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.pageCount() }, (_, i) => i + 1));
  protected readonly paged = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.store.filtered().slice(start, start + PAGE_SIZE);
  });
  protected readonly showingFrom = computed(() => (this.total() ? (this.page() - 1) * PAGE_SIZE + 1 : 0));
  protected readonly showingTo = computed(() => Math.min(this.page() * PAGE_SIZE, this.total()));

  constructor() {
    // Deep-link support: /payments/invoices?status=overdue
    const status = inject(ActivatedRoute).snapshot.queryParamMap.get('status');
    if (status && ['due', 'overdue', 'paid'].includes(status)) this.store.statusFilter.set(status as InvStatusFilter);
    effect(() => { this.store.query(); this.store.statusFilter(); untracked(() => this.page.set(1)); });
  }

  ngOnInit(): void { this.store.load(); }

  protected chip(inv: Invoice) { return invoiceChip(inv.status); }
  protected selectStatus(key: InvStatusFilter, dd: FilterDropdown): void { this.store.statusFilter.set(key); dd.close(); }
  protected goToPage(n: number): void { if (n >= 1 && n <= this.pageCount()) this.page.set(n); }

  protected onAction(action: 'view' | 'pay' | 'download', inv: Invoice): void {
    switch (action) {
      case 'view': this.router.navigateByUrl(`/payments/invoices/${inv.id}`); break;
      case 'pay': this.pay(inv); break;
      case 'download': this.download(inv); break;
    }
  }
  protected openShipment(inv: Invoice): void { this.router.navigateByUrl(`/payments/invoices/${inv.id}`); }
  protected pay(inv: Invoice): void { this.payInvoice.set(inv); }
  /** Mark paid in the background; the drawer stays open to show its success state. */
  protected onPaid(e: { invoice: Invoice; method: string }): void {
    this.store.markPaid(e.invoice.id);
  }
  protected download(inv: Invoice): void { this.toast.show(`Downloading ${inv.id}…`); }

  protected exportCsv(): void {
    const rows = this.store.filtered();
    if (!rows.length) { this.toast.show('Nothing to export', 'error'); return; }
    const headers = ['Invoice', 'Shipment', 'Amount (SAR)', 'Status', 'Created', 'Due date'];
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = [headers.join(',')];
    for (const i of rows) {
      lines.push([i.id, i.shipmentId, String(i.amount.amount), invoiceChip(i.status).label, this.created(i.dueDate), i.dueDate].map((v) => esc(String(v))).join(','));
    }
    downloadCsv(`madar-invoices-${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\r\n'));
    this.toast.show(`Exported ${rows.length} invoices`, 'success');
  }

  protected fmt(n: number): string { return n.toLocaleString('en-US'); }
  protected dt(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  /** Issued date — derived as ~30 days before the due date (Net 30). */
  protected created(iso: string): string {
    const d = new Date(iso);
    d.setDate(d.getDate() - 30);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
