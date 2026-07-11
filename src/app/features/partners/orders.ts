import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Button, FilterDropdown, Icon, StatusChip } from '../../shared/ui';
import { downloadCsv } from '../shipments/csv';
import { OrderActionsMenu } from './order-actions-menu';
import { CreatePoDrawer } from './create-po-drawer';
import { Order, OrderStatusFilter, OrderType, OrdersStore, customerPoRef, orderChip, orderStatusView } from './orders.store';

const PAGE_SIZE = 10;

/** One order section — Sales Orders (selling) or Purchase Orders (buying), by route data. */
@Component({
  selector: 'app-orders',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusChip, Button, FilterDropdown, OrderActionsMenu, CreatePoDrawer],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders implements OnInit {
  protected readonly store = inject(OrdersStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Bound from route data via withComponentInputBinding(). */
  readonly type = input<OrderType>('buying');
  protected readonly isSales = computed(() => this.type() === 'selling');
  protected readonly title = computed(() => (this.isSales() ? 'Sales Orders' : 'Purchase Orders'));
  protected readonly subtitle = computed(() => this.isSales()
    ? 'Orders received from your customers — each carries their PO reference. Confirm to raise your Sales Order and fulfil it.'
    : 'Orders you place with your suppliers. Once sent, the supplier confirms them with a Sales Order.');
  protected readonly partnerCol = computed(() => (this.isSales() ? 'Customer' : 'Supplier'));

  protected readonly statusFilters: { key: OrderStatusFilter; label: string }[] = [
    { key: 'all', label: 'All statuses' },
    { key: 'created', label: 'Created' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'done', label: 'Done' },
    { key: 'cancelled', label: 'Cancelled' },
  ];
  protected readonly statusLabel = computed(() => this.statusFilters.find((f) => f.key === this.store.statusFilter())?.label ?? 'All statuses');

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
    effect(() => this.store.typeFilter.set(this.type()));
    effect(() => { this.store.query(); this.store.typeFilter(); this.store.statusFilter(); untracked(() => this.page.set(1)); });
  }

  ngOnInit(): void { /* store seeds itself */ }

  protected chipFor(o: Order) { return orderChip(o); }
  protected custRef(o: Order): string { return customerPoRef(o); }

  protected selectStatus(key: OrderStatusFilter, dd: FilterDropdown): void { this.store.statusFilter.set(key); dd.close(); }
  protected goToPage(n: number): void { if (n >= 1 && n <= this.pageCount()) this.page.set(n); }

  protected onAction(action: 'view' | 'confirm' | 'track' | 'cancel', o: Order): void {
    switch (action) {
      case 'view': this.open(o); break;
      case 'confirm': this.confirm(o); break;
      case 'track': this.trackShipment(o); break;
      case 'cancel': this.store.cancel(o.id); this.toast.show(`${o.id} cancelled`); break;
    }
  }
  /** Purchase-order create drawer visibility. */
  protected readonly poDrawer = signal(false);

  protected open(o: Order): void { this.router.navigateByUrl(`/partners/order/${o.id}`); }
  protected createPo(): void { this.poDrawer.set(true); }
  /** Confirm raises the Sales Order and creates the shipment + delivery note. */
  protected confirm(o: Order): void {
    const updated = this.store.confirmSO(o.id);
    if (updated) this.toast.show(`${updated.soNumber} confirmed · shipment ${updated.shipmentId} created`, 'success');
  }
  protected trackShipment(o: Order): void {
    if (o.shipmentId) this.router.navigateByUrl(`/shipments/${o.shipmentId}`);
  }

  protected exportCsv(): void {
    const rows = this.store.filtered();
    if (!rows.length) { this.toast.show('Nothing to export', 'error'); return; }
    const headers = ['Order ID', 'Type', 'Partner', 'Status', 'Created', 'Amount (SAR)', 'Shipment'];
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = [headers.join(',')];
    for (const o of rows) {
      lines.push([o.id, o.type, o.partnerName, orderStatusView(o.status).label, o.createdAt.slice(0, 10), String(o.amount), o.shipmentId ?? '']
        .map((v) => esc(String(v))).join(','));
    }
    downloadCsv(`madar-orders-${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\r\n'));
    this.toast.show(`Exported ${rows.length} orders`, 'success');
  }

  protected dt(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  protected fmt(n: number): string { return n.toLocaleString('en-US'); }
}
