import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService } from '../../core/analytics.service';
import { CreateLocation, Customer } from '../../core/data/create.api';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui';
import { CreateDrawerService } from './create-drawer.service';
import { CreateShipmentStore } from './create.store';
import { DateTimeField } from './datetime-field';
import { LocationPicker } from './location-picker';
import { ProductSelect } from './product-select';
import { VehicleMultiselect } from './vehicle-multiselect';

type Tab = 'create' | 'bulk';
type Screen = 'form' | 'map';
const CITIES = ['Riyadh', 'Jeddah', 'Dammam', 'Makkah', 'Madinah', 'Khobar'];

/** Create-shipment as a global drawer: Create (form) + Bulk upload tabs. */
@Component({
  selector: 'app-create-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CreateShipmentStore],
  imports: [A11yModule, Icon, LocationPicker, VehicleMultiselect, ProductSelect, DateTimeField],
  templateUrl: './create-drawer.html',
  styleUrl: './create-drawer.scss',
})
export class CreateDrawer {
  protected readonly svc = inject(CreateDrawerService);
  protected readonly store = inject(CreateShipmentStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly analytics = inject(AnalyticsService);

  protected readonly tab = signal<Tab>('create');
  /** Which screen shows inside the drawer: the form, or the in-drawer map picker. */
  protected readonly screen = signal<Screen>('form');

  // Create-form UI state
  protected readonly expanded = signal<Set<number>>(new Set());
  protected readonly dismissed = signal<Set<number>>(new Set());
  protected readonly advancedOpen = signal(false);
  protected readonly submitting = signal(false);

  // In-drawer map picker
  protected readonly cities = CITIES;
  protected readonly mapTitle = signal('Pick location on map');
  protected readonly mapQuery = signal('');
  protected readonly mapCustomer = signal('');
  private mapTarget: 'pickup' | number = 'pickup';
  protected readonly mapPinned = computed(() => this.mapQuery().trim());

  // Bulk
  protected readonly dragging = signal(false);
  protected readonly bulkSteps = [
    { n: 1, t: 'Upload', d: 'Add your CSV or Excel file.' },
    { n: 2, t: 'Review as drafts', d: 'Fix any flagged rows in the Drafts tab.' },
    { n: 3, t: 'Publish', d: 'A reviewer confirms, then dispatches.' },
  ];

  // Footer price summary
  protected readonly priceLabel = computed(() => {
    const p = this.store.priceState();
    if (p.model === 'fixed') return `SAR ${p.total!.toLocaleString()}`;
    if (p.model === 'bidding') return 'Bidding';
    return 'Price';
  });
  protected readonly priceSub = computed(() => {
    const p = this.store.priceState();
    if (p.model === 'fixed') return 'Contract price';
    if (p.model === 'bidding') return 'No contract rate — carriers quote';
    return 'Add route & vehicle to see your price';
  });
  protected readonly primaryLabel = computed(() => {
    if (this.store.priceState().model === 'bidding') return 'Post for bidding';
    const n = this.store.numberOfShipments();
    return n > 1 ? `Create ${n} shipments` : 'Create shipment';
  });

  constructor() {
    // Fresh form each time the drawer opens.
    effect(() => {
      this.svc.session();
      if (!untracked(() => this.svc.isOpen())) return;
      untracked(() => {
        this.tab.set(this.svc.initialTab());
        this.screen.set('form');
        this.advancedOpen.set(false);
        this.expanded.set(new Set());
        this.dismissed.set(new Set());
        this.store.reset();
        this.store.load();
      });
    });
  }

  // Pickup
  protected clearPickup(): void { this.store.pickup.set(null); }
  protected onPickupPicked(e: { location: CreateLocation | Customer }): void { this.store.pickup.set(e.location as CreateLocation); }

  // Stops
  protected onStopPicked(i: number, e: { location: CreateLocation | Customer; isNew: boolean }): void {
    this.store.setStopLocation(i, e.location, e.isNew);
  }
  protected changeStop(i: number): void { this.store.clearStop(i); }
  protected toggleReceiver(i: number): void {
    this.expanded.update((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }
  protected saveAddress(i: number, as: 'customer' | 'mine' | 'once'): void {
    this.analytics.track('create_new_address_saved', { as });
    this.dismissed.update((s) => new Set(s).add(i));
  }

  // In-drawer map picker (a screen, not a second drawer)
  protected openMap(target: 'pickup' | number): void {
    this.mapTarget = target;
    this.mapTitle.set(target === 'pickup' ? 'Pick pickup on map' : 'Pick drop-off on map');
    this.mapQuery.set('');
    this.mapCustomer.set('');
    this.screen.set('map');
  }
  protected backToForm(): void { this.screen.set('form'); }
  protected pickCity(city: string): void { this.mapQuery.set(`King Fahd Rd, ${city}`); }

  protected useMapLocation(): void {
    const q = this.mapQuery().trim();
    if (!q) return;
    const city = CITIES.find((c) => q.toLowerCase().includes(c.toLowerCase())) ?? 'Riyadh';
    const loc: CreateLocation = {
      id: `map-${Date.now()}`,
      name: this.mapCustomer().trim() || 'Pinned location',
      address: q,
      city,
    };
    if (this.mapTarget === 'pickup') this.store.pickup.set(loc);
    else this.store.setStopLocation(this.mapTarget, loc, true);
    this.screen.set('form');
  }

  // Advanced
  protected toggleAdvanced(): void { this.advancedOpen.update((v) => !v); }
  protected onCarrier(id: string): void { this.store.setCarrier(id || null); }

  // Submit
  protected submit(): void {
    if (!this.store.canSubmit()) return;
    this.submitting.set(true);
    const model = this.store.priceState().model;
    this.analytics.track('create_submitted', { model, via: 'drawer', numberOfShipments: this.store.numberOfShipments() });
    setTimeout(() => {
      this.submitting.set(false);
      this.svc.close();
      if (model === 'bidding') { this.toast.show('Posted for bidding'); this.router.navigate(['/shipments', 'SH-2040']); }
      else { this.toast.show(`Shipment${this.store.numberOfShipments() > 1 ? 's' : ''} created`, 'success'); this.router.navigate(['/shipments']); }
    }, 600);
  }
  protected saveDraft(): void {
    this.toast.show('Saved as draft');
    this.svc.close();
    this.router.navigate(['/shipments']);
  }

  // Bulk — the full validate/fix/queue flow lives on its own page.
  protected openBulkPage(): void {
    this.svc.close();
    this.router.navigate(['/shipments/create/bulk']);
  }
  protected onDrop(e: DragEvent): void { e.preventDefault(); this.dragging.set(false); this.openBulkPage(); }
}
