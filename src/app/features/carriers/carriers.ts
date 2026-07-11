import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { SidePanelService } from '../ai/side-panel.service';
import { Avatar, Button, FilterDropdown, Icon } from '../../shared/ui';
import { AddCarrierDrawer } from './add-carrier-drawer';
import { CarrierMap } from './carrier-map';
import { CarrierProfileDrawer } from './carrier-profile-drawer';
import { Carrier, CarrierType, CarriersStore, DeliveryNote, NewCarrier } from './carriers.store';
import { SpotOfferDrawer } from './spot-offer-drawer';

type Tab = 'directory' | 'map' | 'notes';
const PAGE_SIZE = 8;

/** Carriers — directory · active carriers map (spot pickup) · delivery notes. */
@Component({
  selector: 'app-carriers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Avatar, Button, FilterDropdown, CarrierMap, SpotOfferDrawer, AddCarrierDrawer, CarrierProfileDrawer],
  templateUrl: './carriers.html',
  styleUrl: './carriers.scss',
})
export class Carriers {
  protected readonly store = inject(CarriersStore);
  private readonly toast = inject(ToastService);
  private readonly panel = inject(SidePanelService);

  /** Bound from route data via withComponentInputBinding(). */
  readonly tab = input<Tab>('directory');

  protected readonly typeFilters: { key: 'all' | CarrierType; label: string }[] = [
    { key: 'all', label: 'All carriers' },
    { key: 'contracted', label: 'Contracted' },
    { key: 'marketplace', label: 'Marketplace' },
  ];
  protected readonly typeLabel = computed(() =>
    this.typeFilters.find((f) => f.key === this.store.typeFilter())?.label ?? 'All carriers',
  );
  protected typeCount(key: 'all' | CarrierType): number {
    const c = this.store.carrierCounts();
    return key === 'contracted' ? c.contracted : key === 'marketplace' ? c.marketplace : c.all;
  }

  // Directory pagination
  protected readonly page = signal(1);
  protected readonly total = computed(() => this.store.activeCarriers().length);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.pageCount() }, (_, i) => i + 1));
  protected readonly pagedCarriers = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.store.activeCarriers().slice(start, start + PAGE_SIZE);
  });
  protected readonly showingFrom = computed(() => (this.total() ? (this.page() - 1) * PAGE_SIZE + 1 : 0));
  protected readonly showingTo = computed(() => Math.min(this.page() * PAGE_SIZE, this.total()));
  protected goToPage(n: number): void { if (n >= 1 && n <= this.pageCount()) this.page.set(n); }

  constructor() {
    // Reset to the first page whenever the directory search or filter changes.
    effect(() => { this.store.query(); this.store.typeFilter(); untracked(() => this.page.set(1)); });
  }

  // Available carriers — map / list
  protected readonly carriersView = signal<'map' | 'list'>('map');
  protected readonly profileFleet = signal<string | null>(null);
  protected readonly profile = computed(() => (this.profileFleet() ? this.store.carrierProfile(this.profileFleet()!) : null));
  protected openProfile(name: string): void { this.profileFleet.set(name); }
  protected closeProfile(): void { this.profileFleet.set(null); }

  protected readonly originLabel = computed(() => {
    const o = this.store.originFilter();
    return o === 'all' ? 'Any origin' : `From ${o}`;
  });
  protected readonly destLabel = computed(() => {
    const d = this.store.destFilter();
    return d === 'all' ? 'Any destination' : `To ${d}`;
  });
  protected selectOrigin(orig: 'all' | string, dd: FilterDropdown): void {
    this.store.originFilter.set(orig);
    dd.close();
  }
  /** Null = show all on the map; otherwise only the filtered ids. */
  protected readonly visibleTruckIds = computed<string[] | null>(() => {
    if (!this.store.truckQuery().trim() && this.store.originFilter() === 'all' && this.store.destFilter() === 'all') return null;
    return this.store.filteredTrucks().map((t) => t.id);
  });
  protected selectDest(dest: 'all' | string, dd: FilterDropdown): void {
    this.store.destFilter.set(dest);
    dd.close();
  }

  // Map / spot offer
  protected readonly offerId = signal<string | null>(null);
  protected readonly offerTruck = computed(() => this.store.trucks().find((t) => t.id === this.offerId()) ?? null);

  // Add carrier
  protected readonly addOpen = signal(false);
  protected onCarrierSaved(payload: NewCarrier): void {
    const status = this.store.addCarrier(payload);
    this.addOpen.set(false);
    this.toast.show(status === 'requested'
      ? `${payload.name} is on Madar — request to work with you sent`
      : `Invite to join Madar sent to ${payload.name}`, 'success');
  }
  protected pendingLabel(c: Carrier): { label: string; tone: string } {
    return c.status === 'requested'
      ? { label: 'On Madar · awaiting accept', tone: 'sky' }
      : { label: 'Invited to join', tone: 'neutral' };
  }
  protected resend(c: Carrier): void {
    this.store.resendInvite(c.id);
    this.toast.show(`Reminder sent to ${c.name}`);
  }

  protected selectType(key: 'all' | CarrierType, dd: FilterDropdown): void {
    this.store.typeFilter.set(key);
    dd.close();
  }

  protected carrierType(c: Carrier): { label: string; tone: string } {
    return c.type === 'contracted' ? { label: 'Contracted', tone: 'navy' } : { label: 'Marketplace', tone: 'sky' };
  }
  protected viewCarrier(c: Carrier): void { this.openProfile(c.name); }
  protected message(name: string): void { this.panel.open('messages'); }

  protected openOffer(id: string): void { this.offerId.set(id); }
  protected closeOffer(): void { this.offerId.set(null); }

  // Delivery notes
  protected noteChip(n: DeliveryNote): { label: string; tone: string } {
    switch (n.status) {
      case 'submitted': return { label: 'Submitted', tone: 'ok' };
      case 'requested': return { label: 'Requested', tone: 'sky' };
      default: return { label: 'Pending', tone: 'warn' };
    }
  }
  protected requestNote(n: DeliveryNote): void {
    this.store.requestNote(n.shipmentId);
    this.panel.open('messages');
    this.toast.show(`Requested delivery note from ${n.fleet}`);
  }
  protected markSubmitted(n: DeliveryNote): void {
    this.store.markSubmitted(n.shipmentId);
    this.toast.show(`${n.shipmentId} delivery note recorded`, 'success');
  }
}
