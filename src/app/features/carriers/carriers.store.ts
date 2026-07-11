import { computed, Injectable, signal } from '@angular/core';

export type CarrierType = 'contracted' | 'marketplace';
/** active = worked with; requested = already on Madar, awaiting them to accept working
 *  with you; invited = not on Madar yet, invited to join & work with you. */
export type CarrierStatus = 'active' | 'requested' | 'invited';

/** A carrier you've worked with before (directory). */
export interface Carrier {
  id: string;
  name: string;
  type: CarrierType;
  city: string;
  rating: number;
  shipments: number;
  onTimePct: number;
  lanes: string;
  contactName: string;
  phone: string;
  lastShipment: string;
  status: CarrierStatus;
}

export interface NewCarrier {
  name: string; type: CarrierType; city: string; contactName: string; phone: string; email: string;
}

export interface CarrierProfile {
  name: string; type: CarrierType; city: string; rating: number; shipments: number; onTimePct: number;
  lanes: string; contactName: string; phone: string; email: string; verified: boolean;
  trucks: number; truckTypes: string; yearsActive: number; memberSince: string;
}

function chash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

/** A truck a fleet has posted as available for pickup (spot / backhaul). */
export interface AvailableTruck {
  id: string;
  fleet: string;
  driver: string;
  truckType: string;
  capacityT: number;
  atCity: string;
  headingCity: string;
  availableIn: string;
  rating: number;
  fleetShipments: number;
  verified: boolean;
  distanceKm: number;
  suggestedPrice: number;
  phone: string;
}

export type NoteStatus = 'pending' | 'requested' | 'submitted';
export interface DeliveryNote {
  shipmentId: string;
  receiver: string;
  route: string;
  driver: string;
  fleet: string;
  deliveredAt: string;
  status: NoteStatus;
}

@Injectable({ providedIn: 'root' })
export class CarriersStore {
  // --- Directory -----------------------------------------------------------
  private readonly _carriers = signal<Carrier[]>(CARRIERS);
  readonly carriers = this._carriers.asReadonly();
  readonly query = signal('');
  readonly typeFilter = signal<'all' | CarrierType>('all');

  private readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const t = this.typeFilter();
    return this._carriers().filter((c) => {
      if (t !== 'all' && c.type !== t) return false;
      return !q || `${c.name} ${c.city} ${c.contactName} ${c.lanes}`.toLowerCase().includes(q);
    });
  });
  readonly activeCarriers = computed(() => this.filtered().filter((c) => c.status === 'active'));
  readonly pendingCarriers = computed(() => this.filtered().filter((c) => c.status !== 'active'));
  readonly pendingCarrierCount = computed(() => this._carriers().filter((c) => c.status !== 'active').length);
  readonly carrierCounts = computed(() => {
    const active = this._carriers().filter((c) => c.status === 'active');
    return {
      all: active.length,
      contracted: active.filter((c) => c.type === 'contracted').length,
      marketplace: active.filter((c) => c.type === 'marketplace').length,
    };
  });

  /** Fleets already registered on Madar (would only need to accept working with you). */
  private readonly madarFleets = new Set(
    [...CARRIERS.map((c) => c.name), ...TRUCKS.map((t) => t.fleet), 'Saudi Transport Co.', 'Aljazira Logistics', 'Tamer Freight']
      .map((n) => n.toLowerCase()),
  );

  /** Adds a carrier as a pending invite; returns whether they were already on Madar. */
  addCarrier(input: NewCarrier): CarrierStatus {
    const onMadar = this.madarFleets.has(input.name.trim().toLowerCase());
    const status: CarrierStatus = onMadar ? 'requested' : 'invited';
    const id = `CR-${String(this._carriers().length + 1).padStart(2, '0')}`;
    this._carriers.update((list) => [{
      id, name: input.name.trim(), type: input.type, city: input.city.trim(),
      rating: 0, shipments: 0, onTimePct: 0, lanes: '—',
      contactName: input.contactName.trim(), phone: input.phone.trim(),
      lastShipment: onMadar ? 'Request sent' : 'Invite sent', status,
    }, ...list]);
    return status;
  }
  resendInvite(id: string): void {
    this._carriers.update((list) => list.map((c) =>
      c.id === id ? { ...c, lastShipment: c.status === 'requested' ? 'Request re-sent' : 'Invite re-sent' } : c));
  }

  // --- Available trucks (map / list) ---------------------------------------
  readonly trucks = signal<AvailableTruck[]>(TRUCKS);
  readonly truckQuery = signal('');
  readonly originFilter = signal<'all' | string>('all');
  readonly destFilter = signal<'all' | string>('all');

  readonly origins = computed(() => Array.from(new Set(this.trucks().map((t) => t.atCity))).sort());
  readonly destinations = computed(() => Array.from(new Set(this.trucks().map((t) => t.headingCity))).sort());
  readonly filteredTrucks = computed(() => {
    const q = this.truckQuery().trim().toLowerCase();
    const orig = this.originFilter();
    const dest = this.destFilter();
    return this.trucks().filter((t) => {
      if (orig !== 'all' && t.atCity !== orig) return false;
      if (dest !== 'all' && t.headingCity !== dest) return false;
      return !q || `${t.fleet} ${t.driver} ${t.truckType} ${t.atCity} ${t.headingCity}`.toLowerCase().includes(q);
    });
  });

  /** Full carrier profile — merges directory data with fleet/available-truck data. */
  carrierProfile(name: string): CarrierProfile {
    const c = this._carriers().find((x) => x.name.toLowerCase() === name.toLowerCase());
    const t = this.trucks().find((x) => x.fleet.toLowerCase() === name.toLowerCase());
    const h = chash(name);
    return {
      name,
      type: c?.type ?? 'marketplace',
      city: c?.city ?? t?.atCity ?? '—',
      rating: c?.rating || t?.rating || 4.5,
      shipments: c?.shipments || t?.fleetShipments || 0,
      onTimePct: c?.onTimePct || 85 + (h % 12),
      lanes: c?.lanes ?? (t ? `${t.atCity} → ${t.headingCity}` : '—'),
      contactName: c?.contactName ?? 'Fleet operations',
      phone: c?.phone ?? t?.phone ?? '—',
      email: `dispatch@${name.toLowerCase().replace(/[^a-z]/g, '')}.sa`,
      verified: t?.verified ?? true,
      trucks: 8 + (h % 42),
      truckTypes: 'Flatbed · Curtain-side · Reefer · Box',
      yearsActive: 2 + (h % 12),
      memberSince: `20${15 + (h % 9)}`,
    };
  }

  // --- Delivery notes ------------------------------------------------------
  private readonly _notes = signal<DeliveryNote[]>(NOTES);
  readonly notes = this._notes.asReadonly();
  readonly pendingNotes = computed(() => this._notes().filter((n) => n.status !== 'submitted'));
  readonly pendingCount = computed(() => this.pendingNotes().length);

  requestNote(id: string): void {
    this._notes.update((list) => list.map((n) => (n.shipmentId === id ? { ...n, status: 'requested' } : n)));
  }
  markSubmitted(id: string): void {
    this._notes.update((list) => list.map((n) => (n.shipmentId === id ? { ...n, status: 'submitted' } : n)));
  }
}

const CARRIERS: Carrier[] = ([
  { id: 'CR-01', name: 'Iron Clad Arabia', type: 'contracted', city: 'Jeddah', rating: 4.8, shipments: 128, onTimePct: 96, lanes: 'Jeddah → Riyadh · Jeddah → Makkah', contactName: 'Yousef Al Amoudi', phone: '+966 12 640 1180', lastShipment: '2 days ago' },
  { id: 'CR-02', name: 'Al Rajhi Transport', type: 'contracted', city: 'Riyadh', rating: 4.6, shipments: 342, onTimePct: 93, lanes: 'Riyadh → Dammam · Riyadh → Jeddah', contactName: 'Nasser Al Qahtani', phone: '+966 11 455 9021', lastShipment: 'Yesterday' },
  { id: 'CR-03', name: 'Modern Fleet Est.', type: 'contracted', city: 'Dammam', rating: 4.7, shipments: 87, onTimePct: 90, lanes: 'Dammam → Riyadh', contactName: 'Bandar Al Otaibi', phone: '+966 13 291 7744', lastShipment: '5 days ago' },
  { id: 'CR-04', name: 'Desert Line Logistics', type: 'marketplace', city: 'Riyadh', rating: 4.3, shipments: 41, onTimePct: 88, lanes: 'Riyadh → Buraydah · Riyadh → Hail', contactName: 'Sultan Al Harbi', phone: '+966 11 220 3390', lastShipment: '1 week ago' },
  { id: 'CR-05', name: 'Gulf Cargo Movers', type: 'marketplace', city: 'Jeddah', rating: 4.5, shipments: 63, onTimePct: 91, lanes: 'Jeddah → Madinah · Jeddah → Riyadh', contactName: 'Faisal Baeshen', phone: '+966 12 610 5540', lastShipment: '3 days ago' },
  { id: 'CR-06', name: 'Najd Haulage Co.', type: 'marketplace', city: 'Riyadh', rating: 4.2, shipments: 29, onTimePct: 85, lanes: 'Riyadh → Dammam', contactName: 'Tariq Al Dossari', phone: '+966 11 771 2020', lastShipment: '2 weeks ago' },
] as Omit<Carrier, 'status'>[]).map((c) => ({ ...c, status: 'active' as const }));

const TRUCKS: AvailableTruck[] = [
  { id: 'AV-01', fleet: 'Iron Clad Arabia', driver: 'Saeed Al Ghamdi', truckType: 'Flatbed 13.5m', capacityT: 24, atCity: 'Jeddah', headingCity: 'Riyadh', availableIn: 'Now', rating: 4.8, fleetShipments: 128, verified: true, distanceKm: 8, suggestedPrice: 3100, phone: '+966 55 013 2042' },
  { id: 'AV-02', fleet: 'Gulf Cargo Movers', driver: 'Majed Al Dossari', truckType: 'Curtain-side 12m', capacityT: 18, atCity: 'Jeddah', headingCity: 'Madinah', availableIn: 'in 2h', rating: 4.5, fleetShipments: 63, verified: true, distanceKm: 22, suggestedPrice: 1900, phone: '+966 56 220 4110' },
  { id: 'AV-03', fleet: 'Al Rajhi Transport', driver: 'Turki Al Anazi', truckType: 'Reefer 12m', capacityT: 16, atCity: 'Riyadh', headingCity: 'Dammam', availableIn: 'Now', rating: 4.6, fleetShipments: 342, verified: true, distanceKm: 14, suggestedPrice: 2600, phone: '+966 50 771 3390' },
  { id: 'AV-04', fleet: 'Modern Fleet Est.', driver: 'Khalid Al Otaibi', truckType: 'Box 12m', capacityT: 12, atCity: 'Dammam', headingCity: 'Riyadh', availableIn: 'in 1h', rating: 4.7, fleetShipments: 87, verified: true, distanceKm: 31, suggestedPrice: 2400, phone: '+966 53 220 4410' },
  { id: 'AV-05', fleet: 'Desert Line Logistics', driver: 'Ibrahim Al Sharif', truckType: 'Flatbed 13.5m', capacityT: 24, atCity: 'Riyadh', headingCity: 'Buraydah', availableIn: 'Now', rating: 4.3, fleetShipments: 41, verified: false, distanceKm: 19, suggestedPrice: 1500, phone: '+966 55 013 9922' },
  { id: 'AV-06', fleet: 'Najd Haulage Co.', driver: 'Nawaf Al Shammari', truckType: 'Curtain-side 13.6m', capacityT: 20, atCity: 'Jeddah', headingCity: 'Riyadh', availableIn: 'in 3h', rating: 4.2, fleetShipments: 29, verified: false, distanceKm: 40, suggestedPrice: 3000, phone: '+966 56 900 1122' },
];

const NOTES: DeliveryNote[] = [
  { shipmentId: 'SH-2037', receiver: 'Panda Retail', route: 'Jeddah → Riyadh', driver: 'Saeed Al Ghamdi', fleet: 'Al Rajhi Transport', deliveredAt: 'Today, 19:10', status: 'pending' },
  { shipmentId: 'SH-2038', receiver: 'Nahdi Medical', route: 'Jeddah → Makkah', driver: 'Ibrahim Al Sharif', fleet: 'Iron Clad Arabia', deliveredAt: 'Yesterday, 16:40', status: 'pending' },
  { shipmentId: 'SH-2035', receiver: 'BinDawood Stores', route: 'Riyadh → Dammam', driver: 'Khalid Al Otaibi', fleet: 'Modern Fleet Est.', deliveredAt: 'Jun 28, 14:05', status: 'requested' },
  { shipmentId: 'SH-2031', receiver: 'Al Othaim Markets', route: 'Riyadh → Jeddah', driver: 'Turki Al Anazi', fleet: 'Al Rajhi Transport', deliveredAt: 'Jun 26, 11:20', status: 'pending' },
];
