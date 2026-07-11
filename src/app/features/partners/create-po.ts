import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui';
import { PartnersStore } from './partners.store';
import { LineItem, MY_COMPANY, OrderDoc, OrdersStore, Party, lineTotal } from './orders.store';

/** Buyer-side Purchase Order form — header, parties, shipping, terms, line items, totals, footer. */
@Component({
  selector: 'app-create-po',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, DatePipe],
  templateUrl: './create-po.html',
  styleUrl: './create-po.scss',
})
export class CreatePo implements OnInit {
  protected readonly partners = inject(PartnersStore);
  private readonly orders = inject(OrdersStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly buyer = MY_COMPANY;
  protected readonly poDate = new Date().toISOString();

  protected readonly suppliers = computed(() =>
    this.partners.all().filter((p) => p.relationship === 'supplier' || p.relationship === 'both'));

  // Vendor
  protected readonly vendorId = signal('');
  protected readonly vendor = computed<Party | null>(() => {
    const p = this.partners.byId(this.vendorId());
    return p ? { company: p.name, address: `${p.city}, Saudi Arabia`, contact: p.contactName, phone: p.contactPhone, email: p.contactEmail } : null;
  });

  // Shipping / terms
  protected readonly shipTo = signal(MY_COMPANY.address);
  protected readonly requestedDelivery = signal(this.addDays(7));
  protected readonly shippingMethod = signal('Road freight — FTL');
  protected readonly paymentTerms = signal('Net 30');

  // Line items
  protected readonly items = signal<LineItem[]>([{ sku: '', description: '', qty: 1, unitPrice: 0 }]);
  protected readonly discount = signal(0);
  protected readonly taxPct = signal(15);
  protected readonly freight = signal(0);

  // Footer
  protected readonly notes = signal('');
  protected readonly authorizedBy = signal(MY_COMPANY.contact);

  protected readonly subtotal = computed(() => this.items().reduce((s, li) => s + lineTotal(li), 0));
  protected readonly taxable = computed(() => Math.max(0, this.subtotal() - this.discount()));
  protected readonly tax = computed(() => Math.round(this.taxable() * (this.taxPct() / 100)));
  protected readonly grand = computed(() => this.taxable() + this.tax() + this.freight());

  protected readonly canSave = computed(() =>
    !!this.vendorId() && this.items().some((li) => li.qty > 0 && li.unitPrice > 0) && this.grand() > 0);

  ngOnInit(): void { this.partners.load(); }

  protected lineTot(li: LineItem): number { return lineTotal(li); }
  protected addRow(): void { this.items.update((a) => [...a, { sku: '', description: '', qty: 1, unitPrice: 0 }]); }
  protected removeRow(i: number): void { this.items.update((a) => (a.length > 1 ? a.filter((_, idx) => idx !== i) : a)); }
  protected patchRow(i: number, patch: Partial<LineItem>): void {
    this.items.update((a) => a.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  protected back(): void { this.router.navigateByUrl('/partners/po'); }

  protected save(): void {
    const vendor = this.vendor();
    if (!vendor || !this.canSave()) return;
    const doc: OrderDoc = {
      poNumber: '', poDate: this.poDate,
      buyer: this.buyer, seller: vendor,
      shipTo: this.shipTo(), requestedDelivery: this.requestedDelivery(), shippingMethod: this.shippingMethod(),
      paymentTerms: this.paymentTerms(),
      items: this.items(),
      discount: this.discount(), taxPct: this.taxPct(), freight: this.freight(),
      notes: this.notes(), authorizedBy: this.authorizedBy(),
    };
    const order = this.orders.createPO({ partnerId: this.vendorId(), partnerName: vendor.company, amount: this.grand(), doc });
    this.toast.show(`${order.doc?.poNumber ?? order.id} sent — ${vendor.company} notified`, 'success');
    this.router.navigateByUrl(`/partners/order/${order.id}`);
  }

  protected fmt(n: number): string { return n.toLocaleString('en-US'); }
  private addDays(n: number): string { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
}
