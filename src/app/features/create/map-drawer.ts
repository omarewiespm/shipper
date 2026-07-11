import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CreateLocation } from '../../core/data/create.api';
import { Icon } from '../../shared/ui';

/**
 * Map picker drawer (spec §4.3). Stubbed placeholder map until the map provider
 * decision lands (Google vs Mapbox — same as Live Tracking). Structure, focus
 * trap, and hand-off are real; the map surface is a placeholder.
 */
@Component({
  selector: 'app-map-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon],
  template: `
    @if (open()) {
      <div class="md__scrim" (click)="closed.emit()"></div>
      <aside class="md" role="dialog" aria-modal="true" [attr.aria-label]="title()"
        cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (keydown.escape)="closed.emit()">
        <header class="md__head">
          <h2 class="md__title">{{ title() }}</h2>
          <button class="md__close" type="button" aria-label="Close" (click)="closed.emit()"><app-icon name="x" [size]="18" /></button>
        </header>
        <div class="md__search"><app-icon name="search" [size]="16" /><input class="md__input" placeholder="Search an address" aria-label="Search an address" /></div>
        <div class="md__map">
          <span class="md__pin"><app-icon name="map-pin" [size]="30" /></span>
          <span class="md__hint">Drag the map to position the pin</span>
        </div>
        <footer class="md__foot">
          <p class="md__addr">Pinned: King Fahd Rd, Riyadh</p>
          <button class="md__use" type="button" (click)="use()">Use this location</button>
        </footer>
      </aside>
    }
  `,
  styleUrl: './map-drawer.scss',
})
export class MapDrawer {
  readonly open = input(false);
  readonly title = input('Pick on map');
  readonly closed = output<void>();
  readonly used = output<CreateLocation>();

  protected use(): void {
    this.used.emit({ id: 'map', name: 'Pinned location', address: 'King Fahd Rd', city: 'Riyadh' });
  }
}
