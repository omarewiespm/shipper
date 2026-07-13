import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef,
  inject, input, output, signal, viewChild, ViewEncapsulation,
} from '@angular/core';
import * as L from 'leaflet';
import { Avatar, Icon, IconName } from '../../shared/ui';
import { AvailableTruck } from './carriers.store';

const CITY: Record<string, [number, number]> = {
  Riyadh: [24.71, 46.68], Jeddah: [21.49, 39.19], Dammam: [26.43, 50.10],
  Makkah: [21.39, 39.86], Madinah: [24.47, 39.61], Buraydah: [26.33, 43.97], Hail: [27.52, 41.69],
};

const TRUCK_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;

/** Map of available trucks. Tapping one shows a summary card (à la Live tracking). */
@Component({
  selector: 'app-carrier-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [Icon, Avatar],
  template: `
    <div class="cm">
      <div #map class="cm__map"></div>
      <div class="cm__legend"><span class="cm__ldot"></span> {{ trucks().length }} trucks available now</div>

      @if (selected(); as t) {
        <div class="cmc">
          <button class="cmc__x" type="button" aria-label="Close" (click)="selectedId.set(null)"><app-icon name="x" [size]="16" /></button>
          <div class="cmc__top">
            <app-avatar [name]="t.fleet" [size]="36" tone="neutral" [square]="true" />
            <div class="cmc__id">
              <span class="cmc__namerow"><span class="cmc__name">{{ t.fleet }}</span>@if (t.verified) { <app-icon name="shield" [size]="12" class="cmc__vf" /> }</span>
              <span class="cmc__meta"><span class="cmc__stars"><app-icon name="star" [size]="11" /> {{ t.rating }}</span><span class="cmc__dot">·</span>{{ t.fleetShipments }} shipments</span>
            </div>
            <span class="cmc__avail" [class.is-now]="t.availableIn === 'Now'">{{ t.availableIn }}</span>
          </div>
          <div class="cmc__route"><span class="cmc__city">{{ t.atCity }}</span><app-icon name="arrow-right" [size]="13" /><span class="cmc__city">{{ t.headingCity }}</span><span class="cmc__dist">{{ t.distanceKm }} km away</span></div>
          <div class="cmc__tags"><span class="cmc__tag"><app-icon name="truck" [size]="12" /> {{ t.truckType }}</span><span class="cmc__tag"><app-icon name="package" [size]="12" /> {{ t.capacityT }}t</span></div>
          <div class="cmc__foot">
            <span class="cmc__price"><span class="cmc__pfrom">Fleet asks</span><span class="cmc__pval">SAR {{ t.suggestedPrice.toLocaleString() }}</span></span>
            <div class="cmc__ctas">
              @if (showProfile()) { <button class="cmc__profile" type="button" (click)="profile.emit(t.fleet)">Profile</button> }
              <button class="cmc__cta" type="button" (click)="offer.emit(t.id)"><app-icon [name]="ctaIcon()" [size]="14" /> {{ ctaLabel() }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './carrier-map.scss',
})
export class CarrierMap {
  readonly trucks = input<AvailableTruck[]>([]);
  /** When set, only these truck ids stay visible on the map. */
  readonly visibleIds = input<string[] | null>(null);
  /** Primary CTA on the truck card — reusable for "Make offer" or "Select". */
  readonly ctaLabel = input('Make offer');
  readonly ctaIcon = input<IconName>('messages');
  readonly showProfile = input(true);
  readonly offer = output<string>();
  readonly profile = output<string>();

  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => this.trucks().find((t) => t.id === this.selectedId()) ?? null);

  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('map');
  private map?: L.Map;
  private readonly markers = new Map<string, L.Marker>();
  private readonly ksaBounds = L.latLngBounds([16, 34], [33, 56]);

  constructor() {
    afterNextRender(() => this.initMap());
    // Highlight the selected marker.
    effect(() => {
      const id = this.selectedId();
      this.markers.forEach((m, key) => m.getElement()?.classList.toggle('cmk--active', key === id));
    });
    // Show/hide markers to reflect the search filter (deselect if hidden).
    effect(() => {
      const ids = this.visibleIds();
      const shown = ids ? new Set(ids) : null;
      this.markers.forEach((m, key) => {
        const el = m.getElement();
        if (el) el.style.display = !shown || shown.has(key) ? '' : 'none';
      });
      if (shown && this.selectedId() && !shown.has(this.selectedId()!)) this.selectedId.set(null);
    });
    inject(DestroyRef).onDestroy(() => this.map?.remove());
  }

  private initMap(): void {
    const map = L.map(this.mapEl().nativeElement, {
      center: [24.2, 45.1], zoom: 6, minZoom: 5, maxZoom: 12,
      maxBounds: this.ksaBounds, maxBoundsViscosity: 1,
      zoomControl: false, attributionControl: true,
      scrollWheelZoom: true, wheelPxPerZoomLevel: 130, wheelDebounceTime: 45,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap · © CARTO', maxZoom: 12, minZoom: 5, subdomains: 'abcd',
    }).addTo(map);
    map.on('click', () => this.selectedId.set(null));
    this.map = map;
    setTimeout(() => { map.invalidateSize(); map.fitBounds(this.ksaBounds, { animate: false }); }, 0);

    this.trucks().forEach((t, i) => {
      const base = CITY[t.atCity] ?? [24.5, 45];
      const pos: [number, number] = [base[0] + ((i % 3) - 1) * 0.22, base[1] + (Math.floor(i / 3) - 0.5) * 0.3];
      const marker = L.marker(pos, {
        icon: L.divIcon({
          className: 'cmk-wrap',
          html: `<span class="cmk"><i class="cmk__ring"></i><span class="cmk__badge">${TRUCK_SVG}</span><span class="cmk__flag">${t.truckType.split(' ')[0]} · ${t.capacityT}t</span></span>`,
          iconSize: [34, 34], iconAnchor: [17, 17],
        }),
        title: `${t.fleet} · ${t.atCity} → ${t.headingCity}`,
      }).addTo(map);
      marker.on('click', (e) => { L.DomEvent.stopPropagation(e); this.selectedId.set(t.id); });
      this.markers.set(t.id, marker);
    });
  }
}
