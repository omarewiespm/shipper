import { computed, Injectable, signal } from '@angular/core';

export interface Milestone {
  label: string;
  time: string;
  done: boolean;
  active?: boolean;
}

export interface FleetManager {
  name: string;
  company: string;
  phone: string;
}

export interface LiveShipment {
  id: string;
  receiverName: string;
  originCity: string;
  originAddr: string;
  destCity: string;
  destAddr: string;
  vehicle: string;
  product: string;
  /** 0–100, share of the lane already covered. */
  progressPct: number;
  distanceKm: number;
  speedKmh: number;
  pickedUpAt: string;
  etaAt: string;
  nextStop: string;
  lastPingMins: number;
  driver: { name: string; truck: string; plate: string; phone: string };
  fleet: FleetManager;
  milestones: Milestone[];
}

/** Derived, display-ready tracking metrics for one live shipment. */
export interface TrackingMetrics {
  pct: number;
  pctLeft: number;
  kmDone: number;
  kmLeft: number;
  timeLeftLabel: string;
}

/**
 * Live-tracking store. Self-contained mock of shipments currently on the road,
 * plus the derived progress/distance/time metrics the page renders. Selection
 * drives which shipment the map + detail panel focus on.
 */
@Injectable({ providedIn: 'root' })
export class TrackingStore {
  private readonly _live = signal<LiveShipment[]>(FIXTURES);
  readonly live = this._live.asReadonly();

  readonly selectedId = signal<string>(FIXTURES[0].id);
  readonly selected = computed(() =>
    this._live().find((s) => s.id === this.selectedId()) ?? this._live()[0],
  );

  readonly metrics = computed<TrackingMetrics>(() => this.metricsFor(this.selected()));

  select(id: string): void {
    this.selectedId.set(id);
  }

  metricsFor(s: LiveShipment): TrackingMetrics {
    const pct = Math.round(s.progressPct);
    const kmDone = Math.round((s.distanceKm * pct) / 100);
    const kmLeft = s.distanceKm - kmDone;
    const hoursLeft = s.speedKmh > 0 ? kmLeft / s.speedKmh : 0;
    return { pct, pctLeft: 100 - pct, kmDone, kmLeft, timeLeftLabel: this.duration(hoursLeft) };
  }

  private duration(hours: number): string {
    if (hours <= 0) return 'Arriving';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  }
}

const FIXTURES: LiveShipment[] = [
  {
    id: 'SH-2042',
    receiverName: 'Iron Clad Arabia',
    originCity: 'Jeddah',
    originAddr: 'King Abdullah Port, Gate 4',
    destCity: 'Riyadh',
    destAddr: 'Al Kharj Rd Logistics Park',
    vehicle: 'Flatbed 13.5m',
    product: 'Steel coils',
    progressPct: 62,
    distanceKm: 949,
    speedKmh: 84,
    pickedUpAt: 'Today, 06:20',
    etaAt: 'Today, 20:10',
    nextStop: 'Passing Al Quwaiyah',
    lastPingMins: 2,
    driver: { name: 'Saeed Al Ghamdi', truck: 'Volvo FH16', plate: 'RUH 8421', phone: '+966 55 013 2042' },
    fleet: { name: 'Iron Clad Arabia', company: 'Fleet operations', phone: '+966 12 640 1180' },
    milestones: [
      { label: 'Picked up · Jeddah', time: '06:20', done: true },
      { label: 'On highway 40', time: '08:05', done: true },
      { label: 'In transit', time: 'now', done: false, active: true },
      { label: 'Arriving · Riyadh', time: '~20:10', done: false },
    ],
  },
  {
    id: 'SH-2041',
    receiverName: 'Gulf Cement Co.',
    originCity: 'Dammam',
    originAddr: 'Second Industrial City',
    destCity: 'Jeddah',
    destAddr: 'Industrial Area, Phase 5',
    vehicle: 'Curtain-side 12m',
    product: 'Palletised bags',
    progressPct: 15,
    distanceKm: 1343,
    speedKmh: 78,
    pickedUpAt: 'Today, 05:10',
    etaAt: 'Tomorrow, 02:40',
    nextStop: 'Nearing Al Ahsa',
    lastPingMins: 6,
    driver: { name: 'Majed Al Dossari', truck: 'Mercedes Actros', plate: 'DMM 5590', phone: '+966 56 220 4110' },
    fleet: { name: 'Al Rajhi Transport', company: 'Fleet operations', phone: '+966 13 810 7744' },
    milestones: [
      { label: 'Picked up · Dammam', time: '05:10', done: true },
      { label: 'In transit', time: 'now', done: false, active: true },
      { label: 'Rest stop · Riyadh', time: '~13:00', done: false },
      { label: 'Arriving · Jeddah', time: '~02:40', done: false },
    ],
  },
  {
    id: 'SH-2039',
    receiverName: 'NatPetro Supplies',
    originCity: 'Dammam',
    originAddr: 'King Fahd Industrial Port',
    destCity: 'Riyadh',
    destAddr: 'Exit 18, Central Warehouse',
    vehicle: 'Reefer 12m',
    product: 'Chilled goods',
    progressPct: 91,
    distanceKm: 409,
    speedKmh: 72,
    pickedUpAt: 'Today, 02:30',
    etaAt: 'Today, 08:45',
    nextStop: 'Entering Riyadh',
    lastPingMins: 1,
    driver: { name: 'Turki Al Anazi', truck: 'Scania R500', plate: 'DMM 3187', phone: '+966 50 771 3390' },
    fleet: { name: 'Modern Fleet Est.', company: 'Fleet operations', phone: '+966 11 265 9021' },
    milestones: [
      { label: 'Picked up · Dammam', time: '02:30', done: true },
      { label: 'On highway 40', time: '03:15', done: true },
      { label: 'Almost there', time: 'now', done: false, active: true },
      { label: 'Arriving · Riyadh', time: '~08:45', done: false },
    ],
  },
];
