import { A11yModule } from '@angular/cdk/a11y';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui';
import { PartnersStore } from './partners.store';
import { LineItem, MY_COMPANY, OrderDoc, OrdersStore, Party, lineTotal } from './orders.store';

/**
 * Buyer-side Purchase Order — same form as the standalone page, presented in a
 * side drawer so raising a PO never leaves the Purchase Orders list.
 */
@Component({
  selector: 'app-create-po-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon, DatePipe],
  templateUrl: './create-po-drawer.html',
  styleUrl: './create-po-drawer.scss',
})
export class CreatePoDrawer {
  readonly open = input(false);
  readonly closed = output<void>();

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

  constructor() {
    effect(() => { if (this.open()) untracked(() => this.reset()); });
    this.partners.load();
  }

  private reset(): void {
    this.vendorId.set('');
    this.shipTo.set(MY_COMPANY.address);
    this.requestedDelivery.set(this.addDays(7));
    this.shippingMethod.set('Road freight — FTL');
    this.paymentTerms.set('Net 30');
    this.items.set([{ sku: '', description: '', qty: 1, unitPrice: 0 }]);
    this.discount.set(0);
    this.taxPct.set(15);
    this.freight.set(0);
    this.notes.set('');
    this.authorizedBy.set(MY_COMPANY.contact);
  }

  protected lineTot(li: LineItem): number { return lineTotal(li); }
  protected addRow(): void { this.items.update((a) => [...a, { sku: '', description: '', qty: 1, unitPrice: 0 }]); }
  protected removeRow(i: number): void { this.items.update((a) => (a.length > 1 ? a.filter((_, idx) => idx !== i) : a)); }
  protected patchRow(i: number, patch: Partial<LineItem>): void {
    this.items.update((a) => a.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

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
    this.closed.emit();
    this.router.navigateByUrl(`/partners/order/${order.id}`);
  }

  protected fmt(n: number): string { return n.toLocaleString('en-US'); }
  private addDays(n: number): string { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
}
