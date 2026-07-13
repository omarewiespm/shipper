import {
  afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, effect, ElementRef,
  inject, input, output, viewChild, ViewEncapsulation,
} from '@angular/core';
import * as L from 'leaflet';
import { AvailableTruck } from '../carriers/carriers.store';

const TRUCK_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;
const WH_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35"/><path d="M2 8l10-5 10 5"/><path d="M6 22V12h12v10"/></svg>`;

/**
 * Find-a-truck map: centred and zoomed on the supplier's pickup warehouse, with
 * the available trucks scattered around it (nearer trucks sit closer in). Tap a
 * truck to select it; the parent shows its ETA to the warehouse.
 */
@Component({
  selector: 'app-find-truck-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="ftm">
      <div #map class="ftm__map"></div>
      <div class="ftm__legend"><span class="ftm__ldot"></span> {{ trucks().length }} trucks near the warehouse</div>
    </div>
  `,
  styleUrl: './find-truck-map.scss',
})
export class FindTruckMap {
  readonly trucks = input<AvailableTruck[]>([]);
  readonly visibleIds = input<string[] | null>(null);
  readonly selectedId = input<string | null>(null);
  /** [lat, lng] of the pickup warehouse. */
  readonly warehouse = input<[number, number]>([24.80, 46.72]);
  readonly warehouseLabel = input('Warehouse');
  readonly select = output<string>();

  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('map');
  private map?: L.Map;
  private readonly markers = new Map<string, L.Marker>();

  constructor() {
    afterNextRender(() => this.initMap());
    // Highlight the selected truck.
    effect(() => {
      const id = this.selectedId();
      this.markers.forEach((m, key) => m.getElement()?.classList.toggle('ftm-tk--active', key === id));
    });
    // Reflect the search filter — hide trucks not in visibleIds.
    effect(() => {
      const ids = this.visibleIds();
      const shown = ids ? new Set(ids) : null;
      this.markers.forEach((m, key) => {
        const el = m.getElement();
        if (el) el.style.display = !shown || shown.has(key) ? '' : 'none';
      });
    });
    inject(DestroyRef).onDestroy(() => this.map?.remove());
  }

  private initMap(): void {
    const wh = this.warehouse();
    const map = L.map(this.mapEl().nativeElement, {
      center: wh, zoom: 10, minZoom: 8, maxZoom: 14,
      zoomControl: false, attributionControl: true,
      scrollWheelZoom: true, wheelPxPerZoomLevel: 130, wheelDebounceTime: 45,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap · © CARTO', maxZoom: 14, minZoom: 8, subdomains: 'abcd',
    }).addTo(map);
    this.map = map;

    // Warehouse marker.
    L.marker(wh, {
      icon: L.divIcon({
        className: 'ftm-wh-wrap',
        html: `<span class="ftm-wh"><span class="ftm-wh__pin">${WH_SVG}</span><span class="ftm-wh__label">${this.warehouseLabel()}</span></span>`,
        iconSize: [36, 36], iconAnchor: [18, 18],
      }),
      title: this.warehouseLabel(),
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(map);

    // Trucks scattered around the warehouse — nearer trucks sit closer in.
    const lngScale = 1 / Math.cos((wh[0] * Math.PI) / 180);
    const points: L.LatLngExpression[] = [wh];
    this.trucks().forEach((t, i) => {
      const angle = i * 137.5 * (Math.PI / 180); // golden angle → even spread
      const radius = 0.02 + (Math.min(t.distanceKm, 60) / 60) * 0.11;
      const pos: [number, number] = [wh[0] + radius * Math.cos(angle), wh[1] + radius * Math.sin(angle) * lngScale];
      points.push(pos);
      const marker = L.marker(pos, {
        icon: L.divIcon({
          className: 'ftm-tk-wrap',
          html: `<span class="ftm-tk"><i class="ftm-tk__ring"></i><span class="ftm-tk__badge">${TRUCK_SVG}</span><span class="ftm-tk__flag">${t.fleet.split(' ')[0]} · ${t.capacityT}t</span></span>`,
          iconSize: [32, 32], iconAnchor: [16, 16],
        }),
        title: `${t.fleet} · ${t.distanceKm} km away`,
      }).addTo(map);
      marker.on('click', (e) => { L.DomEvent.stopPropagation(e); this.select.emit(t.id); });
      this.markers.set(t.id, marker);
    });

    // Keep it zoomed in on the cluster around the warehouse.
    setTimeout(() => {
      map.invalidateSize();
      if (points.length > 1) map.fitBounds(L.latLngBounds(points as L.LatLngTuple[]), { padding: [60, 60], maxZoom: 11, animate: false });
      else map.setView(wh, 11, { animate: false });
    }, 0);
  }
}
