import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Invoice } from '../../models';
import { Icon, IconName, StatusChip } from '../../shared/ui';
import { InvoicesStore, invoiceBill, invoiceChip } from './invoices.store';
import { PayInvoiceDrawer } from './pay-invoice-drawer';

const BILL_FROM = { company: 'Madar Logistics Services', address: 'King Fahd Rd, Riyadh 11564', vat: 'VAT 3001234567800003', email: 'billing@madar.sa' };
const BILL_TO = { company: 'Najm Trading Co.', address: 'Exit 10, Northern Ring Rd, Riyadh 12471', vat: 'VAT 3009876543200003', email: 'ops@najmtrading.sa' };

/** Full-page invoice — laid out as a real invoice document, with Pay / Download. */
@Component({
  selector: 'app-invoice-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusChip, PayInvoiceDrawer],
  templateUrl: './invoice-detail.html',
  styleUrl: './invoice-detail.scss',
})
export class InvoiceDetail implements OnInit {
  readonly id = input.required<string>();

  protected readonly store = inject(InvoicesStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly from = BILL_FROM;
  protected readonly to = BILL_TO;
  protected readonly payOpen = signal<Invoice | null>(null);

  protected readonly invoice = computed(() => this.store.byId(this.id()) ?? null);
  protected readonly chip = computed(() => { const i = this.invoice(); return i ? invoiceChip(i.status) : null; });
  protected readonly bill = computed(() => { const i = this.invoice(); return i ? invoiceBill(i) : null; });
  protected readonly items = computed(() => {
    const i = this.invoice(); const b = this.bill();
    if (!i || !b) return [];
    const rows = [{ desc: `Freight — shipment ${i.shipmentId}`, qty: 1, unit: b.amount, total: b.amount }];
    if (b.waiting) rows.push({ desc: 'Waiting time charge', qty: 1, unit: b.waiting, total: b.waiting });
    return rows;
  });
  protected readonly docs = computed<{ label: string; icon: IconName; ref: string }[]>(() => {
    const i = this.invoice();
    if (!i) return [];
    const s = i.shipmentId.replace(/\D/g, '');
    return [
      { label: 'Invoice', icon: 'receipt', ref: i.id },
      { label: 'Delivery note', icon: 'file-check', ref: `DN-${s}` },
      { label: 'Waybill', icon: 'file-check', ref: `WB-${s}` },
    ];
  });

  ngOnInit(): void { this.store.load(); }

  protected back(): void { this.router.navigateByUrl('/payments/invoices'); }
  protected openShipment(sid: string): void { this.router.navigateByUrl(`/shipments/${sid}`); }
  protected pay(inv: Invoice): void { this.payOpen.set(inv); }
  protected onPaid(e: { invoice: Invoice; method: string }): void { this.store.markPaid(e.invoice.id); }
  protected download(inv: Invoice): void { this.toast.show(`Downloading ${inv.id}…`); }

  protected fmt(n: number): string { return n.toLocaleString('en-US'); }
  protected dt(iso: string): string { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  /** Issue date ≈ 30 days before due (Net 30). */
  protected issued(iso: string): string { const d = new Date(iso); d.setDate(d.getDate() - 30); return this.dt(d.toISOString()); }
}
