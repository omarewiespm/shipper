import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../../shared/ui';

interface Pt { x: number; y: number; }

/** Waypoints (viewBox 360×240) forming a gentle south-west → north-east lane. */
const ROUTE: Pt[] = [
  { x: 44, y: 190 },
  { x: 128, y: 150 },
  { x: 214, y: 118 },
  { x: 316, y: 56 },
];

/**
 * Stylised route map: a soft grid "map", the lane drawn as a solid (traveled) +
 * dashed (remaining) polyline, origin/destination pins, and a truck marker
 * placed at `progressPct` along the lane. Pure geometry — no live map SDK.
 */
@Component({
  selector: 'app-route-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="rmap">
      <svg viewBox="0 0 360 240" class="rmap__svg" role="img"
        [attr.aria-label]="originCity() + ' to ' + destCity() + ', ' + pct() + '% complete'">
        <defs>
          <pattern id="rgrid" width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M26 0H0V26" fill="none" stroke="rgba(34,50,103,.06)" stroke-width="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="360" height="240" fill="url(#rgrid)" />

        <!-- Remaining (dashed) then traveled (solid) on top -->
        <polyline [attr.points]="remaining()" fill="none" stroke="var(--mut)" stroke-width="3"
          stroke-linecap="round" stroke-dasharray="2 8" opacity="0.7" />
        <polyline [attr.points]="traveled()" fill="none" stroke="var(--navy)" stroke-width="3.5"
          stroke-linecap="round" stroke-linejoin="round" />

        <!-- Origin -->
        <circle [attr.cx]="origin.x" [attr.cy]="origin.y" r="6" fill="#fff" stroke="var(--navy)" stroke-width="2.5" />
        <!-- Destination -->
        <g [attr.transform]="'translate(' + dest.x + ',' + dest.y + ')'">
          <circle r="9" fill="var(--orange)" opacity="0.18" />
          <circle r="4.5" fill="var(--orange)" />
        </g>
      </svg>

      <!-- Truck marker (HTML overlay so we can use the icon + pulse) -->
      <div class="rmap__truck" [style.left.%]="truckLeft()" [style.top.%]="truckTop()">
        <span class="rmap__pulse"></span>
        <span class="rmap__badge"><app-icon name="truck" [size]="15" /></span>
      </div>

      <span class="rmap__tag rmap__tag--from">{{ originCity() }}</span>
      <span class="rmap__tag rmap__tag--to"><app-icon name="flag" [size]="12" /> {{ destCity() }}</span>
      <span class="rmap__live"><span class="rmap__livedot"></span> Live</span>
    </div>
  `,
  styleUrl: './route-map.scss',
})
export class RouteMap {
  readonly progressPct = input(0);
  readonly originCity = input('');
  readonly destCity = input('');

  protected readonly origin = ROUTE[0];
  protected readonly dest = ROUTE[ROUTE.length - 1];

  protected readonly pct = computed(() => Math.round(this.progressPct()));

  /** Point at `progressPct` along the polyline, plus the split index. */
  private readonly at = computed<{ p: Pt; k: number }>(() => {
    const segLen = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
    const total = ROUTE.slice(1).reduce((sum, p, i) => sum + segLen(ROUTE[i], p), 0);
    let target = (this.progressPct() / 100) * total;
    for (let i = 0; i < ROUTE.length - 1; i++) {
      const a = ROUTE[i], b = ROUTE[i + 1], len = segLen(a, b);
      if (target <= len || i === ROUTE.length - 2) {
        const t = len ? Math.min(1, target / len) : 0;
        return { p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, k: i };
      }
      target -= len;
    }
    return { p: this.dest, k: ROUTE.length - 2 };
  });

  private str(pts: Pt[]): string {
    return pts.map((p) => `${p.x},${p.y}`).join(' ');
  }

  protected readonly traveled = computed(() => {
    const { p, k } = this.at();
    return this.str([...ROUTE.slice(0, k + 1), p]);
  });
  protected readonly remaining = computed(() => {
    const { p, k } = this.at();
    return this.str([p, ...ROUTE.slice(k + 1)]);
  });

  protected readonly truckLeft = computed(() => (this.at().p.x / 360) * 100);
  protected readonly truckTop = computed(() => (this.at().p.y / 240) * 100);
}
