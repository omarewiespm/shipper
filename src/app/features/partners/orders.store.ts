import { computed, Injectable, signal } from '@angular/core';

export type OrderType = 'selling' | 'buying';
/** Order-only lifecycle — never shipment states (in transit / delivered live on the shipment). */
export type OrderStatus = 'created' | 'confirmed' | 'done' | 'cancelled';
export type OrderTypeFilter = 'all' | OrderType;
export type OrderStatusFilter = 'all' | OrderStatus;

export interface Party { company: string; address: string; contact: string; phone: string; email: string; }
export interface LineItem { sku: string; description: string; qty: number; unitPrice: number; }
/** The PO/SO document body — the same items, confirmed from both sides. */
export interface OrderDoc {
  poNumber: string; poDate: string;
  soNumber?: string; soDate?: string;
  buyer: Party; seller: Party;
  shipTo: string; requestedDelivery: string; shippingMethod: string;
  paymentTerms: string;
  items: LineItem[];
  discount: number; taxPct: number; freight: number;
  notes: string; authorizedBy: string;
  deliveryNoteId?: string;
}

export interface Order {
  id: string;
  type: OrderType;          // selling = customer order (we ship out) · buying = supplier order (they deliver)
  partnerId: string;
  partnerName: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  createdAt: string;
  shipmentId?: string;
  // Sales-order confirmation + fulfilment links
  soNumber?: string;
  soDate?: string;
  deliveryNoteId?: string;
  doc?: OrderDoc;           // persisted for orders raised through the PO form
}

/** The shipper's own company — buyer on our POs, seller on our SOs. */
export const MY_COMPANY: Party = {
  company: 'Najm Trading Co.',
  address: 'Exit 10, Northern Ring Rd, Riyadh 12471',
  contact: 'Procurement Desk',
  phone: '+966 11 234 5678',
  email: 'ops@najmtrading.sa',
};

const PRODUCTS = [
  { sku: 'BEV-1201', description: 'Beverages — assorted cases' },
  { sku: 'CEM-3320', description: 'Portland cement — 50kg bags' },
  { sku: 'STL-1120', description: 'Steel rebar 12mm — bundles' },
  { sku: 'DET-4410', description: 'Detergent — retail cartons' },
  { sku: 'WTR-2404', description: 'Bottled water — 24-pack' },
];
function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function addDays(iso: string, n: number): string { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString(); }

export function lineTotal(li: LineItem): number { return Math.round(li.qty * li.unitPrice); }
export function docTotals(doc: OrderDoc) {
  const subtotal = doc.items.reduce((s, li) => s + lineTotal(li), 0);
  const discount = doc.discount || 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * ((doc.taxPct || 0) / 100));
  const freight = doc.freight || 0;
  return { subtotal, discount, tax, freight, grand: taxable + tax + freight };
}

/** Deterministic line items for a seeded order, ≈ its value pre-VAT. */
function buildItems(order: Order): LineItem[] {
  const h = hash(order.id);
  const subtotal = Math.max(1, Math.round(order.amount / 1.15));
  const n = (h % 2) + 2;
  const items: LineItem[] = [];
  let remaining = subtotal;
  for (let i = 0; i < n; i++) {
    const p = PRODUCTS[(h + i) % PRODUCTS.length];
    const lineTot = i === n - 1 ? remaining : Math.round(subtotal / n);
    remaining -= lineTot;
    const qty = ((h >> (i + 1)) % 20) + 5;
    items.push({ sku: p.sku, description: p.description, qty, unitPrice: Math.max(1, Math.round(lineTot / qty)) });
  }
  return items;
}

/** Document view for an order — persisted doc if present, else generated. */
export function buildDoc(order: Order, buyer: Party, seller: Party): OrderDoc {
  const b = order.doc;
  return {
    poNumber: b?.poNumber ?? `PO-${order.id.slice(-4)}`,
    poDate: b?.poDate ?? order.createdAt,
    soNumber: order.soNumber,
    soDate: order.soDate,
    buyer: b?.buyer ?? buyer,
    seller: b?.seller ?? seller,
    shipTo: b?.shipTo ?? buyer.address,
    requestedDelivery: b?.requestedDelivery ?? addDays(order.createdAt, 7),
    shippingMethod: b?.shippingMethod ?? 'Road freight — FTL',
    paymentTerms: b?.paymentTerms ?? 'Net 30',
    items: b?.items ?? buildItems(order),
    discount: b?.discount ?? 0,
    taxPct: b?.taxPct ?? 15,
    freight: b?.freight ?? 0,
    notes: b?.notes ?? '',
    authorizedBy: b?.authorizedBy ?? seller.contact,
    deliveryNoteId: order.deliveryNoteId,
  };
}

export function orderStatusView(s: OrderStatus): { label: string; tone: 'ok' | 'warn' | 'info' | 'sky' | 'neutral' | 'danger' } {
  switch (s) {
    case 'created': return { label: 'Created', tone: 'warn' };
    case 'confirmed': return { label: 'Confirmed', tone: 'sky' };
    case 'done': return { label: 'Done', tone: 'ok' };
    case 'cancelled': return { label: 'Cancelled', tone: 'danger' };
  }
}
export function orderTypeView(t: OrderType): { label: string; tone: 'sky' | 'gold' } {
  return t === 'selling' ? { label: 'Sales Order', tone: 'sky' } : { label: 'Purchase Order', tone: 'gold' };
}
/** Sales orders arrive from a customer — their PO number is captured here. */
export function customerPoRef(o: Order): string { return o.type === 'selling' ? `CPO-${o.id.slice(-4)}` : ''; }
/** Status chip. A sales order reads Draft → Approved; a purchase order reads Created → Confirmed. */
export function orderChip(o: Order): { label: string; tone: 'ok' | 'warn' | 'info' | 'sky' | 'neutral' | 'danger' } {
  if (o.type === 'selling') {
    switch (o.status) {
      case 'created': return { label: 'Draft', tone: 'neutral' };
      case 'confirmed': return { label: 'Approved', tone: 'ok' };
      case 'done': return { label: 'Fulfilled', tone: 'ok' };
      case 'cancelled': return { label: 'Cancelled', tone: 'danger' };
    }
  }
  return orderStatusView(o.status);
}

const SEED: Order[] = [
  { id: 'ORD-5201', type: 'selling', partnerId: 'PTR-001', partnerName: 'Al Othaim Markets', status: 'confirmed', amount: 18500, currency: 'SAR', createdAt: '2026-07-02T09:00:00+03:00', shipmentId: 'SH-2050' },
  { id: 'ORD-5202', type: 'buying', partnerId: 'PTR-004', partnerName: 'Iron Clad Arabia', status: 'confirmed', amount: 24000, currency: 'SAR', createdAt: '2026-07-03T10:30:00+03:00', shipmentId: 'SH-2042' },
  { id: 'ORD-5203', type: 'selling', partnerId: 'PTR-002', partnerName: 'Panda Retail', status: 'confirmed', amount: 32000, currency: 'SAR', createdAt: '2026-07-05T08:15:00+03:00' },
  { id: 'ORD-5204', type: 'buying', partnerId: 'PTR-005', partnerName: 'Gulf Cement Co.', status: 'created', amount: 15000, currency: 'SAR', createdAt: '2026-07-06T11:00:00+03:00' },
  { id: 'ORD-5205', type: 'selling', partnerId: 'PTR-003', partnerName: 'Nahdi Medical', status: 'done', amount: 9800, currency: 'SAR', createdAt: '2026-06-26T14:00:00+03:00', shipmentId: 'SH-2035' },
  { id: 'ORD-5206', type: 'buying', partnerId: 'PTR-008', partnerName: 'NatPetro Supplies', status: 'confirmed', amount: 41000, currency: 'SAR', createdAt: '2026-07-01T09:45:00+03:00' },
  { id: 'ORD-5207', type: 'selling', partnerId: 'PTR-007', partnerName: 'Extra Stores', status: 'created', amount: 12500, currency: 'SAR', createdAt: '2026-07-07T13:20:00+03:00' },
  { id: 'ORD-5208', type: 'selling', partnerId: 'PTR-009', partnerName: 'BinDawood Stores', status: 'confirmed', amount: 21000, currency: 'SAR', createdAt: '2026-07-04T10:00:00+03:00', shipmentId: 'SH-2044' },
  { id: 'ORD-5209', type: 'buying', partnerId: 'PTR-006', partnerName: 'Modern Trading Est.', status: 'done', amount: 17600, currency: 'SAR', createdAt: '2026-06-22T09:00:00+03:00', shipmentId: 'SH-2037' },
  { id: 'ORD-5210', type: 'selling', partnerId: 'PTR-010', partnerName: 'SACO Hardware', status: 'confirmed', amount: 28400, currency: 'SAR', createdAt: '2026-07-06T15:30:00+03:00' },
  { id: 'ORD-5211', type: 'buying', partnerId: 'PTR-004', partnerName: 'Iron Clad Arabia', status: 'cancelled', amount: 8000, currency: 'SAR', createdAt: '2026-06-28T12:00:00+03:00' },
  { id: 'ORD-5212', type: 'selling', partnerId: 'PTR-001', partnerName: 'Al Othaim Markets', status: 'done', amount: 14200, currency: 'SAR', createdAt: '2026-06-20T08:00:00+03:00', shipmentId: 'SH-2033' },
  { id: 'ORD-5213', type: 'buying', partnerId: 'PTR-005', partnerName: 'Gulf Cement Co.', status: 'confirmed', amount: 36500, currency: 'SAR', createdAt: '2026-07-08T09:10:00+03:00' },
  { id: 'ORD-5214', type: 'selling', partnerId: 'PTR-006', partnerName: 'Modern Trading Est.', status: 'created', amount: 19900, currency: 'SAR', createdAt: '2026-07-09T11:40:00+03:00' },
];

/** Orders store — customer (selling) and supplier (buying) orders, PO→SO→shipment. */
@Injectable({ providedIn: 'root' })
export class OrdersStore {
  private readonly _all = signal<Order[]>(SEED);
  readonly all = this._all.asReadonly();

  readonly query = signal('');
  readonly typeFilter = signal<OrderTypeFilter>('all');
  readonly statusFilter = signal<OrderStatusFilter>('all');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const t = this.typeFilter();
    const s = this.statusFilter();
    return this._all().filter((o) => {
      if (t !== 'all' && o.type !== t) return false;
      if (s !== 'all' && o.status !== s) return false;
      return !q || `${o.id} ${o.partnerName}`.toLowerCase().includes(q);
    });
  });

  readonly counts = computed(() => {
    const all = this._all();
    return {
      total: all.length,
      selling: all.filter((o) => o.type === 'selling').length,
      buying: all.filter((o) => o.type === 'buying').length,
    };
  });

  byId(id: string): Order | undefined { return this._all().find((o) => o.id === id); }

  /** Raise a Purchase Order (buyer side) from the PO form. Starts as 'created'. */
  createPO(input: { partnerId: string; partnerName: string; amount: number; doc: OrderDoc }): Order {
    const id = `ORD-${5200 + this._all().length + 1}`;
    const order: Order = {
      id,
      type: 'buying',
      partnerId: input.partnerId,
      partnerName: input.partnerName,
      status: 'created',
      amount: input.amount,
      currency: 'SAR',
      createdAt: input.doc.poDate || new Date().toISOString(),
      doc: { ...input.doc, poNumber: input.doc.poNumber || `PO-${id.slice(-4)}` },
    };
    this._all.update((list) => [order, ...list]);
    return order;
  }

  cancel(id: string): void {
    this._all.update((list) => list.map((o) => (o.id === id ? { ...o, status: 'cancelled' } : o)));
  }

  /**
   * Confirm an order by raising the Sales Order (seller side). This also creates
   * the shipment (pickup/drop-off/weight/product are already known) and the
   * delivery note whose id the waybill will carry.
   */
  confirmSO(id: string): Order | undefined {
    let res: Order | undefined;
    this._all.update((list) => list.map((o) => {
      if (o.id !== id || o.status === 'cancelled' || o.soNumber) return o;
      res = {
        ...o,
        status: 'confirmed',
        soNumber: `SO-${o.id.slice(-4)}`,
        soDate: new Date().toISOString(),
        shipmentId: o.shipmentId ?? `SH-2${o.id.slice(-3)}`,
        deliveryNoteId: `DN-${o.id.slice(-4)}`,
      };
      return res;
    }));
    return res;
  }

  /** Sales-order step 1: approve the draft (Draft → Approved). No shipment yet. */
  approve(id: string): Order | undefined {
    let res: Order | undefined;
    this._all.update((list) => list.map((o) => {
      if (o.id !== id || o.status !== 'created') return o;
      res = { ...o, status: 'confirmed', soNumber: `SO-${o.id.slice(-4)}`, soDate: new Date().toISOString() };
      return res;
    }));
    return res;
  }

  /** Sales-order step 2: create the shipment + delivery note for an approved order. */
  assignShipment(id: string): Order | undefined {
    let res: Order | undefined;
    this._all.update((list) => list.map((o) => {
      if (o.id !== id || o.shipmentId || o.status !== 'confirmed') return o;
      res = { ...o, shipmentId: `SH-2${o.id.slice(-3)}`, deliveryNoteId: `DN-${o.id.slice(-4)}` };
      return res;
    }));
    return res;
  }
}
