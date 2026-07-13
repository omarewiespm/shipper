import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Icon, StatusChip } from '../../shared/ui';
import { FindTruck } from './find-truck';
import { PartnersStore } from './partners.store';
import { MY_COMPANY, OrdersStore, Party, buildDoc, customerPoRef, docTotals, lineTotal, orderChip, orderTypeView } from './orders.store';

type Tab = 'po' | 'so' | 'fulfillment';
type SalesTab = 'details' | 'findtruck';

/** Full order detail — the PO document, the SO confirmation, and fulfilment. */
@Component({
  selector: 'app-order-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NgTemplateOutlet, Icon, StatusChip, FindTruck],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail implements OnInit {
  readonly id = input.required<string>();

  private readonly orders = inject(OrdersStore);
  private readonly partners = inject(PartnersStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly tab = signal<Tab>('po');
  /** Sales-order view tabs: the document vs. finding a truck to fulfil it. */
  protected readonly salesTab = signal<SalesTab>('details');

  protected readonly order = computed(() => this.orders.byId(this.id()) ?? null);
  protected readonly statusView = computed(() => { const o = this.order(); return o ? orderChip(o) : { label: '', tone: 'neutral' as const }; });
  protected readonly typeView = computed(() => orderTypeView(this.order()?.type ?? 'buying'));
  protected readonly confirmed = computed(() => !!this.order()?.soNumber);

  /** Sales order (we're the seller) → single Sales Order view; buying → PO/SO tabs. */
  protected readonly isSales = computed(() => this.order()?.type === 'selling');
  protected readonly draft = computed(() => this.order()?.status === 'created');
  protected readonly soNo = computed(() => {
    const o = this.order();
    return !o ? '' : o.type === 'selling' ? `SO-${o.id.slice(-4)}` : (o.soNumber ?? '');
  });

  private readonly partnerParty = computed<Party | null>(() => {
    const p = this.partners.byId(this.order()?.partnerId ?? '');
    return p ? { company: p.name, address: `${p.city}, Saudi Arabia`, contact: p.contactName, phone: p.contactPhone, email: p.contactEmail } : null;
  });
  protected readonly doc = computed(() => {
    const o = this.order();
    if (!o) return null;
    const partner = this.partnerParty() ?? MY_COMPANY;
    const buyer = o.type === 'buying' ? MY_COMPANY : partner;
    const seller = o.type === 'buying' ? partner : MY_COMPANY;
    return buildDoc(o, buyer, seller);
  });
  protected readonly totals = computed(() => { const d = this.doc(); return d ? docTotals(d) : null; });

  ngOnInit(): void { this.orders; this.partners.load(); }

  protected lineTot = lineTotal;
  protected fmt(n: number): string { return n.toLocaleString('en-US'); }
  protected readonly custRef = computed(() => { const o = this.order(); return o ? customerPoRef(o) : ''; });

  protected back(): void { this.router.navigateByUrl(this.order()?.type === 'selling' ? '/partners/sales' : '/partners/po'); }
  protected goShipment(): void { const s = this.order()?.shipmentId; if (s) this.router.navigateByUrl(`/shipments/${s}`); }

  /** Purchase-order side: supplier confirms with an SO (also creates the shipment). */
  protected confirm(): void {
    const updated = this.orders.confirmSO(this.id());
    if (updated) {
      this.toast.show(`${updated.soNumber} confirmed · shipment ${updated.shipmentId} created`, 'success');
      this.tab.set('so');
    }
  }
  /** Sales-order step 1: approve the draft. */
  protected approve(): void {
    const updated = this.orders.approve(this.id());
    if (updated) this.toast.show(`${updated.soNumber} approved`, 'success');
  }
  /** Sales-order step 2: create the outbound shipment + delivery note. */
  protected createShipment(): void {
    const updated = this.orders.assignShipment(this.id());
    if (updated) this.toast.show(`Shipment ${updated.shipmentId} created · delivery note ${updated.deliveryNoteId}`, 'success');
  }
}
