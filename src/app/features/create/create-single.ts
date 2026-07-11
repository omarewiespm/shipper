import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics.service';
import { CreateLocation, Customer } from '../../core/data/create.api';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui';
import { CreateShipmentStore } from './create.store';
import { DateTimeField } from './datetime-field';
import { LocationPicker } from './location-picker';
import { MapDrawer } from './map-drawer';
import { PricePanel } from './price-panel';
import { ProductSelect } from './product-select';
import { VehicleMultiselect } from './vehicle-multiselect';

/** Single-create form (spec §2.2–§8). */
@Component({
  selector: 'app-create-single',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, LocationPicker, VehicleMultiselect, ProductSelect, DateTimeField, PricePanel, MapDrawer],
  templateUrl: './create-single.html',
  styleUrl: './create-single.scss',
})
export class CreateSingle implements OnInit {
  protected readonly store = inject(CreateShipmentStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly analytics = inject(AnalyticsService);

  protected readonly pickupEditing = signal(false);
  protected readonly expanded = signal<Set<number>>(new Set());
  protected readonly dismissed = signal<Set<number>>(new Set());
  protected readonly advancedOpen = signal(false);
  protected readonly submitting = signal(false);

  protected readonly mapOpen = signal(false);
  protected readonly mapTitle = signal('Pick location on map');
  private mapTarget: 'pickup' | number = 'pickup';

  ngOnInit(): void {
    this.store.load();
  }

  // Pickup
  protected clearPickup(): void { this.store.pickup.set(null); this.pickupEditing.set(false); }
  protected onPickupPicked(e: { location: CreateLocation | Customer }): void {
    this.store.pickup.set(e.location);
    this.pickupEditing.set(false);
  }

  // Stops
  protected onStopPicked(i: number, e: { location: CreateLocation | Customer; isNew: boolean }): void {
    this.store.setStopLocation(i, e.location, e.isNew);
    if (e.isNew) this.analytics.track('create_new_address_saved', { as: 'once' });
  }
  protected changeStop(i: number): void { this.store.clearStop(i); }
  protected toggleReceiver(i: number): void {
    this.expanded.update((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }
  protected saveAddress(i: number, as: 'customer' | 'mine' | 'once'): void {
    this.analytics.track('create_new_address_saved', { as });
    this.dismissed.update((s) => new Set(s).add(i));
  }

  // Map
  protected openMap(target: 'pickup' | number): void {
    this.mapTarget = target;
    this.mapTitle.set(target === 'pickup' ? 'Pick pickup on map' : 'Pick drop-off on map');
    this.mapOpen.set(true);
    this.analytics.track('create_map_opened', {});
  }
  protected onMapUsed(loc: CreateLocation): void {
    if (this.mapTarget === 'pickup') { this.store.pickup.set(loc); this.pickupEditing.set(false); }
    else { this.store.setStopLocation(this.mapTarget, loc, true); }
    this.mapOpen.set(false);
  }

  // Advanced
  protected toggleAdvanced(): void {
    this.advancedOpen.update((v) => !v);
    if (this.advancedOpen()) this.analytics.track('create_advanced_opened', {});
  }
  protected onCarrier(id: string): void {
    this.store.setCarrier(id || null);
    if (id) this.analytics.track('create_carrier_assigned', { carrier: id });
  }

  // Submit
  protected submit(): void {
    if (!this.store.canSubmit()) return;
    this.submitting.set(true);
    const model = this.store.priceState().model;
    this.analytics.track('create_submitted', {
      model, numberOfShipments: this.store.numberOfShipments(),
      stops: this.store.stops().length, vehicleTypes: this.store.vehicleTypes().length,
    });
    setTimeout(() => {
      this.submitting.set(false);
      if (model === 'bidding') {
        this.toast.show('Posted for bidding');
        this.router.navigate(['/shipments', 'SH-2042']);
      } else {
        this.toast.show(`Shipment${this.store.numberOfShipments() > 1 ? 's' : ''} created`, 'success');
        this.router.navigate(['/shipments']);
      }
    }, 600);
  }
  protected saveDraft(): void {
    this.analytics.track('create_saved_as_draft', {});
    this.toast.show('Saved as draft');
    this.router.navigate(['/shipments']);
  }
}
