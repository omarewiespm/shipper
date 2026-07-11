import {
  afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, effect,
  ElementRef, inject, input, viewChild, ViewEncapsulation,
} from '@angular/core';
import * as L from 'leaflet';

export interface MapPoint { lat?: number; lng?: number; city: string; }

const TRUCK_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;

const KSA_CENTER: [number, number] = [24.5, 45.1];

/**
 * Real Leaflet map for a single shipment: origin + destination pins joined by a
 * lane. In `live` mode it also drops a truck marker at `progress`% along the lane
 * (traveled solid, remaining dashed). Reused by the Details map and Tracking tab.
 */
@Component({
  selector: 'app-shipment-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="smap">
      <div #map class="smap__canvas" [style.height.px]="height()"></div>
      @if (live()) { <span class="smap__live"><i class="smap__livedot"></i> Live</span> }
      <ng-content />
    </div>
  `,
  styleUrl: './shipment-map.scss',
})
export class ShipmentMap {
  readonly origin = input.required<MapPoint>();
  readonly dest = input.required<MapPoint>();
  readonly progress = input(0);   // 0–100 along the lane (live mode)
  readonly live = input(false);
  readonly searching = input(false); // radar sweep on the pickup pin
  readonly height = input(240);

  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private map?: L.Map;
  private truck?: L.Marker;
  private traveled?: L.Polyline;
  private remaining?: L.Polyline;
  private readonly ksaBounds = L.latLngBounds([16, 34], [33, 56]);

  constructor() {
    afterNextRender(() => this.initMap());
    effect(() => { const p = this.progress(); if (this.map) this.updateProgress(p); });
    inject(DestroyRef).onDestroy(() => this.map?.remove());
  }

  private ll(p: MapPoint): L.LatLng {
    return L.latLng(p.lat ?? KSA_CENTER[0], p.lng ?? KSA_CENTER[1]);
  }

  private pin(kind: 'from' | 'to', city: string): L.DivIcon {
    const radar = kind === 'from' && this.searching()
      ? `<i class="smp__radar"></i><i class="smp__radar smp__radar--2"></i>`
      : '';
    return L.divIcon({
      className: 'smp-wrap',
      html: `<span class="smp smp--${kind}">${radar}<i class="smp__dot"></i><span class="smp__label">${city}</span></span>`,
      iconSize: [14, 14], iconAnchor: [7, 7],
    });
  }

  private initMap(): void {
    const o = this.ll(this.origin()), d = this.ll(this.dest());
    // Fixed map: framed to the route, no zoom / drag / scroll interaction.
    const map = L.map(this.mapEl().nativeElement, {
      zoomControl: false, attributionControl: true,
      dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
      boxZoom: false, keyboard: false, touchZoom: false,
      maxBounds: this.ksaBounds, maxBoundsViscosity: 1, minZoom: 4, maxZoom: 12,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap · © CARTO', maxZoom: 12, minZoom: 5, subdomains: 'abcd',
    }).addTo(map);

    // Lane: dashed base + a solid "traveled" overlay we grow in live mode.
    this.remaining = L.polyline([o, d], { color: '#8a93a8', weight: 3, opacity: 0.7, dashArray: '2 9' }).addTo(map);
    this.traveled = L.polyline([o], { color: '#223267', weight: 3.5, opacity: 0.9 }).addTo(map);

    L.marker(o, { icon: this.pin('from', this.origin().city) }).addTo(map);
    L.marker(d, { icon: this.pin('to', this.dest().city) }).addTo(map);

    this.map = map;
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds([o, d]).pad(0.45), { animate: false });
    }, 0);
    this.updateProgress(this.progress());
  }

  private updateProgress(pct: number): void {
    if (!this.map || !this.live()) return;
    const o = this.ll(this.origin()), d = this.ll(this.dest());
    const t = Math.max(0, Math.min(1, pct / 100));
    const at = L.latLng(o.lat + (d.lat - o.lat) * t, o.lng + (d.lng - o.lng) * t);

    this.traveled?.setLatLngs([o, at]);
    this.remaining?.setLatLngs([at, d]);

    if (!this.truck) {
      this.truck = L.marker(at, {
        icon: L.divIcon({
          className: 'smk-wrap',
          html: `<span class="smk"><i class="smk__ring"></i><span class="smk__badge">${TRUCK_SVG}</span></span>`,
          iconSize: [30, 30], iconAnchor: [15, 15],
        }),
        zIndexOffset: 1000,
      }).addTo(this.map);
    } else {
      this.truck.setLatLng(at);
    }
  }
}
