import { computed, inject, Injectable, signal } from '@angular/core';
import { Carrier, CREATE_API, CreateData, CreateLocation, Customer } from '../../core/data/create.api';

export interface Stop {
  location: (CreateLocation | Customer) | null;
  receiverContact: string;
  isNew: boolean;
}

export type PriceModel = 'fixed' | 'bidding' | 'incomplete';
export interface PriceState {
  model: PriceModel;
  rate?: number;
  total?: number;
  vehicle?: string;
}

/** Create-shipment form state + live price resolution (spec §10). */
@Injectable()
export class CreateShipmentStore {
  private readonly api = inject(CREATE_API);

  readonly loading = signal(false);
  private readonly data = signal<CreateData | null>(null);

  // Form state
  readonly pickup = signal<CreateLocation | null>(null);
  readonly stops = signal<Stop[]>([{ location: null, receiverContact: '', isNew: false }]);
  readonly vehicleTypes = signal<string[]>([]);
  readonly productType = signal('');
  readonly weight = signal('');
  readonly scheduledPickup = signal<string>('');
  readonly scheduledDelivery = signal<string>('');
  readonly numberOfShipments = signal(1);
  readonly assignedCarrier = signal<string | null>(null);
  readonly assignedDriver = signal<string | null>(null);

  // Reference data
  readonly pickupLocations = computed(() => this.data()?.pickupLocations ?? []);
  readonly customers = computed(() => this.data()?.customers ?? []);
  readonly allVehicleTypes = computed(() => this.data()?.vehicleTypes ?? []);
  readonly products = computed(() => this.data()?.products ?? []);
  readonly carriers = computed(() => this.data()?.carriers ?? []);
  readonly carrierDrivers = computed<Carrier['drivers']>(() =>
    this.carriers().find((c) => c.id === this.assignedCarrier())?.drivers ?? [],
  );

  readonly destinationCity = computed(() => {
    const first = this.stops()[0]?.location;
    return first?.city ?? null;
  });

  /** Live price (spec §8.2): key (destinationCity, first vehicle) against rates. */
  readonly priceState = computed<PriceState>(() => {
    const from = this.pickup();
    const dest = this.destinationCity();
    const vehicle = this.vehicleTypes()[0];
    if (!from || !dest || !vehicle) return { model: 'incomplete' };

    const row = this.data()?.rates.find(
      (r) => r.destinationCity === dest && r.vehicleType === vehicle,
    );
    if (!row) return { model: 'bidding', vehicle };
    return { model: 'fixed', rate: row.rate, total: row.rate * this.numberOfShipments(), vehicle };
  });

  readonly canSubmit = computed(() =>
    !!this.pickup() && !!this.stops()[0]?.location && this.vehicleTypes().length > 0,
  );

  readonly carrierName = computed(() =>
    this.carriers().find((c) => c.id === this.assignedCarrier())?.name ?? null,
  );

  /** Clear the form back to a blank shipment (reference data is kept). */
  reset(): void {
    this.pickup.set(null);
    this.stops.set([{ location: null, receiverContact: '', isNew: false }]);
    this.vehicleTypes.set([]);
    this.productType.set('');
    this.weight.set('');
    this.scheduledPickup.set('');
    this.scheduledDelivery.set('');
    this.numberOfShipments.set(1);
    this.assignedCarrier.set(null);
    this.assignedDriver.set(null);
  }

  load(): void {
    if (this.data()) return;
    this.loading.set(true);
    this.api.get().subscribe({
      next: (d) => {
        this.data.set(d);
        // Pickup starts empty — the user picks it explicitly each time.
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // --- Mutations -----------------------------------------------------------
  setStopLocation(i: number, location: CreateLocation | Customer, isNew = false): void {
    this.stops.update((s) => s.map((st, idx) =>
      idx === i
        ? { ...st, location, isNew, receiverContact: 'contact' in location && location.contact ? `${location.contact.name} · ${location.contact.phone}` : st.receiverContact }
        : st));
  }
  setReceiverContact(i: number, value: string): void {
    this.stops.update((s) => s.map((st, idx) => (idx === i ? { ...st, receiverContact: value } : st)));
  }
  addStop(): void {
    this.stops.update((s) => [...s, { location: null, receiverContact: '', isNew: false }]);
  }
  removeStop(i: number): void {
    this.stops.update((s) => (s.length > 1 ? s.filter((_, idx) => idx !== i) : s));
  }
  clearStop(i: number): void {
    this.stops.update((s) => s.map((st, idx) => (idx === i ? { ...st, location: null, isNew: false } : st)));
  }

  toggleVehicle(type: string): void {
    this.vehicleTypes.update((v) => (v.includes(type) ? v.filter((t) => t !== type) : [...v, type]));
  }
  removeVehicle(type: string): void {
    this.vehicleTypes.update((v) => v.filter((t) => t !== type));
  }

  stepShipments(delta: number): void {
    this.numberOfShipments.update((n) => this.clampShipments(n + delta));
  }
  setShipments(n: number): void {
    this.numberOfShipments.set(this.clampShipments(Number.isFinite(n) ? Math.round(n) : 1));
  }
  private clampShipments(n: number): number {
    return Math.min(99, Math.max(1, n));
  }

  setCarrier(id: string | null): void {
    this.assignedCarrier.set(id);
    this.assignedDriver.set(null);
  }
}
