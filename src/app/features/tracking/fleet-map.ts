import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef,
  effect, ElementRef, inject, input, output, signal, viewChild, ViewEncapsulation,
} from '@angular/core';
import * as L from 'leaflet';
import { Icon } from '../../shared/ui';
import { LiveShipment, TrackingStore } from './tracking.store';

/** City coordinates (lat, lng) for placing trucks on the real map. */
const CITY: Record<string, [number, number]> = {
  Riyadh: [24.71, 46.68], Jeddah: [21.49, 39.19], Dammam: [26.43, 50.10],
  Makkah: [21.39, 39.86], Madinah: [24.47, 39.61], Buraydah: [26.33, 43.97],
  Tabuk: [28.38, 36.55], Abha: [18.22, 42.51], Hail: [27.52, 41.69],
  Yanbu: [24.09, 38.06], Jubail: [27.01, 49.66],
};

/** Inline Lucide "truck" glyph for the divIcon markers. */
const TRUCK_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;

/**
 * Real Leaflet map of the fleet. Trucks are animated circle markers (no route by
 * default); clicking one draws its lane and opens a summary card with Chat /
 * Details actions. A search box filters trucks by shipment, customer, city or driver.
 */
@Component({
  selector: 'app-fleet-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  templateUrl: './fleet-map.html',
  styleUrl: './fleet-map.scss',
})
export class FleetMap {
  private readonly store = inject(TrackingStore);
  readonly trucks = input<LiveShipment[]>([]);
  readonly chat = output<string>();
  readonly details = output<string>();

  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('map');
  protected readonly query = signal('');
  protected readonly selectedId = signal<string | null>(null);

  private map?: L.Map;
  private readonly markers = new Map<string, L.Marker>();
  private routeGroup?: L.LayerGroup;
  private readonly ksaBounds = L.latLngBounds([16, 34], [33, 56]);

  protected readonly selected = computed(() =>
    this.trucks().find((t) => t.id === this.selectedId()) ?? null,
  );

  protected readonly matches = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.trucks();
    return this.trucks().filter((s) =>
      `${s.id} ${s.receiverName} ${s.originCity} ${s.destCity} ${s.driver.name} ${s.product}`.toLowerCase().includes(q),
    );
  });

  constructor() {
    afterNextRender(() => this.initMap());

    // Dim trucks that fall outside the current search.
    effect(() => {
      const ids = new Set(this.matches().map((s) => s.id));
      this.markers.forEach((m, id) => {
        m.getElement()?.classList.toggle('tkm--dim', !ids.has(id));
      });
    });

    // On select: draw the lane (solid = covered, dotted = remaining) split at the
    // truck, and zoom gently to the route. On deselect: back to the kingdom view.
    effect(() => {
      const sel = this.selected();
      const map = this.map;
      if (!map) return;
      this.routeGroup?.remove();
      this.routeGroup = undefined;
      // Selected truck highlighted; the rest go muted/disabled until deselect.
      this.markers.forEach((m, id) => {
        const el = m.getElement();
        el?.classList.toggle('tkm--active', id === sel?.id);
        el?.classList.toggle('tkm--muted', !!sel && id !== sel.id);
      });
      if (sel) {
        const o = CITY[sel.originCity] ?? [24.5, 45];
        const d = CITY[sel.destCity] ?? [24.5, 45];
        const t = sel.progressPct / 100;
        const truck: [number, number] = [o[0] + (d[0] - o[0]) * t, o[1] + (d[1] - o[1]) * t];
        const traveled = L.polyline([o, truck], { color: '#223267', weight: 4, opacity: 0.95, lineCap: 'round' });
        const remaining = L.polyline([truck, d], { color: '#223267', weight: 3, opacity: 0.45, dashArray: '1 10', lineCap: 'round' });
        // Numbered endpoints: 1 = pickup, 2 = drop-off.
        const endpoint = (c: [number, number], n: string, kind: string) => L.marker(c, {
          icon: L.divIcon({ className: 'tke-wrap', html: `<span class="tke tke--${kind}">${n}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }),
          interactive: false, keyboard: false,
        });
        this.routeGroup = L.layerGroup([
          traveled, remaining,
          endpoint(o, '1', 'pickup'), endpoint(d, '2', 'drop'),
        ]).addTo(map);
        // Reserve the bottom (centered card area) so the route stays above it.
        map.fitBounds(L.latLngBounds([o, d]), {
          animate: true, maxZoom: 7,
          paddingTopLeft: [40, 40], paddingBottomRight: [40, 280],
        });
      } else {
        map.fitBounds(this.ksaBounds, { animate: true });
      }
    });

    inject(DestroyRef).onDestroy(() => this.map?.remove());
  }

  private initMap(): void {
    // Keep the view locked to Saudi Arabia so it can't drift out to the world map.
    const map = L.map(this.mapEl().nativeElement, {
      center: [24.2, 45.1], zoom: 6,
      minZoom: 5, maxZoom: 12,
      maxBounds: this.ksaBounds, maxBoundsViscosity: 1,
      // Own zoom control placed top-right (clear of the top-left search box).
      zoomControl: false, attributionControl: true,
      // Trackpad pinch / scroll zooms the MAP (Leaflet prevents the browser page
      // from zooming). Damped so it isn't jumpy; bounds keep it inside KSA.
      scrollWheelZoom: true,
      wheelPxPerZoomLevel: 130, wheelDebounceTime: 45,
      doubleClickZoom: true, touchZoom: true,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap · © CARTO', maxZoom: 12, minZoom: 5, subdomains: 'abcd',
    }).addTo(map);
    // Clicking empty map deselects; the effect then zooms back to the kingdom.
    map.on('click', () => this.selectedId.set(null));
    this.map = map;
    // Ensure tiles lay out correctly once the container has its final size.
    setTimeout(() => { map.invalidateSize(); map.fitBounds(this.ksaBounds, { animate: false }); }, 0);

    for (const s of this.trucks()) {
      const o = CITY[s.originCity] ?? [24.5, 45], d = CITY[s.destCity] ?? [24.5, 45];
      const t = s.progressPct / 100;
      const pos: [number, number] = [o[0] + (d[0] - o[0]) * t, o[1] + (d[1] - o[1]) * t];
      const marker = L.marker(pos, {
        icon: L.divIcon({
          className: 'tkm-wrap',
          html: `<span class="tkm">
            <i class="tkm__ring"></i>
            <span class="tkm__badge">${TRUCK_SVG}</span>
            <span class="tkm__flag">${s.id} · ${Math.round(s.progressPct)}%</span>
          </span>`,
          iconSize: [34, 34], iconAnchor: [17, 17],
        }),
        title: `${s.id} · ${s.receiverName}`,
        riseOnHover: true,
      }).addTo(map);
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        // While a truck is selected, clicking any truck just deselects (same as
        // clicking the map); the user can then click a truck to select it.
        this.selectedId.set(this.selectedId() ? null : s.id);
      });
      this.markers.set(s.id, marker);
    }
  }

  protected metrics(s: LiveShipment) { return this.store.metricsFor(s); }
  protected pick(id: string): void { this.selectedId.set(id); }
  protected round(n: number): number { return Math.round(n); }
}
