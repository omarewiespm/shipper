import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { Shipment, ShipmentStatus } from '../../../models';
import { Avatar, Icon, IconName, StatusChip } from '../../../shared/ui';
import { shipmentChipView } from '../../../shared/ui/status/status.presenter';
import { SidePanelService } from '../../ai/side-panel.service';
import { ShipmentMap } from './shipment-map';

type Tab = 'details' | 'documents' | 'tracking' | 'billing' | 'status';
interface Person { name: string; phone: string; }
type Tone = 'ok' | 'warn' | 'info';

/** How far along the origin→destination lane the truck sits, by status. */
const TRANSIT_PCT: Partial<Record<ShipmentStatus, number>> = {
  accepted: 0, driver_accepted: 4, at_pickup: 10, loaded: 16, in_transit: 55, arrived: 92, delivered: 100, completed: 100,
};

/**
 * Full lifecycle, in order — shown as one activity timeline (done + upcoming).
 * `rank` ties each display stage to how far the shipment has progressed; some
 * stages share a rank where there's no distinct underlying status.
 */
const JOURNEY: { label: string; rank: number; statuses: ShipmentStatus[] }[] = [
  { label: 'Order Created', rank: 0, statuses: ['draft', 'posted'] },
  { label: 'Fleet Allocated', rank: 1, statuses: ['accepted'] },
  { label: 'Fleet Approved', rank: 1, statuses: ['accepted'] },
  { label: 'Driver Assigned', rank: 2, statuses: ['driver_accepted'] },
  { label: 'Trip Started', rank: 2, statuses: ['driver_accepted'] },
  { label: 'At Pickup Location', rank: 3, statuses: ['at_pickup'] },
  { label: 'Loaded', rank: 4, statuses: ['loaded'] },
  { label: 'Departed', rank: 5, statuses: ['in_transit'] },
  { label: 'Arrived', rank: 6, statuses: ['arrived'] },
  { label: 'Delivered', rank: 7, statuses: ['delivered', 'completed'] },
];
/** Current status → progress rank. Terminal states (cancelled/rejected) → -1. */
const RANK: Partial<Record<ShipmentStatus, number>> = {
  draft: 0, posted: 0, accepted: 1, driver_accepted: 2,
  at_pickup: 3, loaded: 4, in_transit: 5, arrived: 6, delivered: 7, completed: 7,
};
const NAMES = ['Abdullah Al Harbi', 'Mohammed Al Otaibi', 'Khalid Al Dosari', 'Fahad Al Shehri', 'Sultan Al Ghamdi', 'Nawaf Al Anazi', 'Yousef Al Amoudi', 'Bandar Al Qahtani'];

/** Fixed / assigned shipment detail — tabbed, with a sticky price panel. */
@Component({
  selector: 'app-fixed-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Avatar, StatusChip, ShipmentMap],
  templateUrl: './fixed-detail.html',
  styleUrl: './fixed-detail.scss',
})
export class FixedDetailView {
  readonly shipment = input.required<Shipment>();
  readonly receiver = input('');

  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly panel = inject(SidePanelService);

  protected readonly tab = signal<Tab>('details');
  protected readonly tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Details' },
    { key: 'documents', label: 'Documents' },
    { key: 'tracking', label: 'Tracking' },
    { key: 'billing', label: 'Billing' },
    { key: 'status', label: 'Status' },
  ];
  protected readonly chip = computed(() => shipmentChipView(this.shipment().status));

  /** Before a carrier accepts — the shipment can still be edited. */
  protected readonly preAssigned = computed(() => ['draft', 'posted'].includes(this.shipment().status));
  protected readonly cancelled = computed(() => ['cancelled', 'rejected', 'not_fulfilled'].includes(this.shipment().status));

  // --- Map / tracking -------------------------------------------------------
  protected readonly mapOrigin = computed(() => {
    const o = this.shipment().origin;
    return { lat: o.lat, lng: o.lng, city: o.city };
  });
  protected readonly mapDest = computed(() => {
    const d = this.shipment().destination;
    return { lat: d.lat, lng: d.lng, city: d.city };
  });
  /** True once the shipment is physically on the road. */
  protected readonly isMoving = computed(() => ['in_transit', 'arrived'].includes(this.shipment().status));
  protected readonly delivered = computed(() => ['delivered', 'completed'].includes(this.shipment().status));
  /** Truck position along the lane (0–100) for the live map. */
  protected readonly livePct = computed(() => TRANSIT_PCT[this.shipment().status] ?? 0);

  /** The whole journey as timeline rows: done ones carry a timestamp, upcoming ones don't. */
  protected readonly journey = computed(() => {
    const s = this.shipment();
    const cur = RANK[s.status] ?? -1; // terminal states (cancelled/rejected) → -1
    const start = new Date(s.createdAt).getTime();

    // Base rows: done state + any timestamp we know from the real timeline.
    const rows = JOURNEY.map((stage, i) => {
      const entry = s.timeline.find((t) => stage.statuses.includes(t.status));
      const done = i === 0 || cur >= stage.rank;
      let ms: number | null = null;
      if (i === 0) ms = start;
      else if (entry) ms = new Date(entry.at).getTime();
      return { label: stage.label, done, ms };
    });

    // Fill timestamps for done stages with no real event by interpolating
    // between the nearest known anchors — so every done stage reads a time.
    const done = rows.filter((r) => r.done);
    for (let k = 0; k < done.length; k++) {
      if (done[k].ms != null) continue;
      let p = k - 1; while (p >= 0 && done[p].ms == null) p--;
      let n = k + 1; while (n < done.length && done[n].ms == null) n++;
      const prev = p >= 0 ? done[p].ms! : start;
      const next = n < done.length ? done[n].ms! : prev;
      done[k].ms = n > p ? Math.round(prev + (next - prev) * ((k - p) / (n - p))) : prev;
    }

    let latest = -1;
    rows.forEach((r, i) => { if (r.done) latest = i; });
    return rows.map((r, i) => ({
      label: r.label,
      done: r.done,
      latest: i === latest,
      at: r.done && r.ms != null ? new Date(r.ms).toISOString() : undefined,
    }));
  });

  /** Fraction (0–1) of the journey completed — drives the timeline's filled spine. */
  protected readonly doneFrac = computed(() => {
    const rows = this.journey();
    let latest = 0;
    rows.forEach((r, i) => { if (r.done) latest = i; });
    return rows.length > 1 ? latest / (rows.length - 1) : 0;
  });

  protected readonly deliverySigned = computed(() =>
    this.shipment().documents.some((d) => d.type === 'delivery_note' && d.signedAt),
  );

  // --- Origin / destination -------------------------------------------------
  protected readonly origin = computed(() => {
    const s = this.shipment();
    return { city: s.origin.city, place: s.origin.line, contact: this.person(s.id + 'o') };
  });
  protected readonly dest = computed(() => {
    const s = this.shipment();
    return { city: s.destination.city, place: `${this.receiver()} · ${s.destination.line}`, contact: this.person(s.id + 'd') };
  });
  private person(seed: string): Person {
    const h = this.hash(seed);
    const name = NAMES[h % NAMES.length];
    const d = (h >> 3) % 9 + 1;
    const a = String((h >> 6) % 900 + 100), b = String((h >> 9) % 9000 + 1000);
    return { name, phone: `+966 5${d} ${a} ${b}` };
  }
  private hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

  // --- Distance & duration --------------------------------------------------
  /** Straight-line km between origin and destination. */
  protected readonly distanceKm = computed(() => {
    const { origin: o, destination: d } = this.shipment();
    const oLat = o.lat ?? 0, oLng = o.lng ?? 0, dLat0 = d.lat ?? 0, dLng0 = d.lng ?? 0;
    const R = 6371, toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(dLat0 - oLat), dLng = toRad(dLng0 - oLng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(oLat)) * Math.cos(toRad(dLat0)) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  });
  /** Rough driving estimate at ~70 km/h over the road (×1.25 vs straight line). */
  protected readonly driveDuration = computed(() => {
    const mins = Math.round((this.distanceKm() * 1.25) / 70 * 60);
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? `${h}h ${m ? m + 'm' : ''}`.trim() : `${m}m`;
  });

  // --- Field groups ---------------------------------------------------------
  protected readonly trip = computed(() => {
    const s = this.shipment();
    const scheduledPickup = s.scheduledPickupAt ?? this.addDays(s.createdAt, 2);
    const requestedDelivery = s.requestedDeliveryAt ?? s.etaAt ?? this.addDays(scheduledPickup, 2);
    const actualPickup = s.timeline.find((t) => t.status === 'at_pickup')?.at;
    return { created: s.createdAt, scheduledPickup, requestedDelivery, actualPickup };
  });
  protected readonly load = computed(() => {
    const s = this.shipment();
    return {
      vehicle: s.truckType,
      optionalTruck: s.optionalTruckType ?? '—',
      product: s.cargo.type,
      productPrice: s.productPrice,
      poId: s.poId ?? `PO-${s.id.replace(/\D/g, '')}`,
    };
  });
  protected readonly extra = computed(() => {
    const s = this.shipment();
    return {
      name: s.shipmentName ?? '—',
      createdBy: s.createdBy ?? this.person(s.id + 'u').name,
      notes: s.notes ?? '—',
    };
  });
  private addDays(iso: string, n: number): string {
    const d = new Date(iso);
    d.setDate(d.getDate() + n);
    return d.toISOString();
  }

  // --- Price panel ----------------------------------------------------------
  protected readonly priceTag = computed(() => {
    switch (this.shipment().priceModel) {
      case 'accepted_bid': return 'Spot';
      case 'signed_amendment': return 'Amended';
      default: return 'Fixed';
    }
  });
  protected readonly cta = computed<{ label: string; kind: string } | null>(() => {
    const s = this.shipment().status;
    if (this.preAssigned()) return { label: 'Edit shipment', kind: 'edit' };
    if (s === 'delivered' && !this.deliverySigned()) return { label: 'Sign delivery note', kind: 'sign' };
    if (s === 'completed') return { label: 'View invoice', kind: 'invoice' };
    if (this.cancelled()) return { label: 'Rebook', kind: 'rebook' };
    return { label: 'Track live', kind: 'track' };
  });

  // --- Billing --------------------------------------------------------------
  /**
   * The agreed rate isn't the final bill: waiting/other surcharges can be added
   * before completion. Spot shipments pay on booking; TaaS/contract is Net 60.
   */
  protected readonly billing = computed(() => {
    const s = this.shipment();
    const base = s.price.amount;
    const isSpot = s.priceModel === 'accepted_bid' || s.capacitySource === 'marketplace';
    const surcharges: { label: string; amount: number }[] = [];
    // Demo surcharge: a waiting charge shows up on some completed trips.
    if (this.delivered() && this.hash(s.id) % 2 === 0) {
      surcharges.push({ label: 'Waiting time — 2h at origin', amount: 120 });
    }
    const total = base + surcharges.reduce((a, x) => a + x.amount, 0);
    const deliveredAt = s.timeline.find((t) => ['delivered', 'completed'].includes(t.status))?.at;
    const paid = isSpot ? !this.preAssigned() : s.status === 'completed';
    const dueAt = !isSpot && deliveredAt ? this.addDays(deliveredAt, 60) : undefined;
    const invoiceId = s.documents.find((d) => d.type === 'invoice')?.id;
    return { base, currency: s.price.currency, surcharges, total, isSpot, paid, dueAt, invoiceId };
  });
  /** Compact payment-state chip used by the panel and the billing tab. */
  protected readonly paymentState = computed<{ label: string; tone: Tone }>(() => {
    const b = this.billing();
    if (b.paid) return { label: 'Paid', tone: 'ok' };
    if (b.isSpot) return { label: 'Prepaid on booking', tone: 'info' };
    if (b.dueAt) return { label: `Net 60 · due ${this.dateShort(b.dueAt)}`, tone: 'warn' };
    return { label: 'Billed on delivery · Net 60', tone: 'info' };
  });

  protected payBill(): void { this.toast.show('Opening payment…'); this.router.navigateByUrl('/payments/wallet'); }

  protected act(kind?: string): void {
    switch (kind) {
      case 'track': this.router.navigateByUrl('/tracking'); break;
      case 'sign': this.toast.show('Opening delivery note to sign…'); break;
      case 'invoice': this.router.navigateByUrl('/payments'); break;
      case 'edit': this.toast.show('Editing — carrier not assigned yet'); break;
      case 'rebook': this.router.navigateByUrl('/shipments/create'); break;
    }
  }
  protected cancelOrder(): void { this.toast.show('Order cancelled'); this.router.navigateByUrl('/shipments'); }
  protected openPo(poId?: string): void { this.toast.show(`Opening ${poId}…`); this.router.navigateByUrl('/partners/po'); }
  protected back(): void { this.router.navigateByUrl('/shipments'); }
  protected chat(): void { this.panel.open('messages'); }
  protected call(name?: string): void { if (name) this.toast.show(`Calling ${name}…`); }

  protected fmt(n: number): string { return n.toLocaleString('en-US'); }
  protected weight(): string {
    const kg = this.shipment().cargo.weightKg;
    return kg >= 1000 ? `${(kg / 1000).toLocaleString('en-US')} t` : `${kg} kg`;
  }
  protected dt(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  protected dateShort(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  protected chipLabel(status: ShipmentStatus): string { return shipmentChipView(status).label; }

  protected readonly docIcon: Record<string, IconName> = {
    waybill: 'file-check', contract: 'signature', bayan: 'shield', delivery_note: 'file-check', pod: 'shield', invoice: 'receipt', price_amendment: 'percent',
  };
  protected readonly docLabel: Record<string, string> = {
    waybill: 'Waybill', contract: 'Shipment contract', bayan: 'Bayan (trip manifest)', delivery_note: 'Delivery note', pod: 'Proof of delivery', invoice: 'Invoice', price_amendment: 'Price amendment',
  };
}
