import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CreateLocation, Customer } from '../../core/data/create.api';
import { Icon } from '../../shared/ui';
import { CreateShipmentStore } from './create.store';

interface Opt { id: string; name: string; sub: string; isNew: boolean; raw: CreateLocation | Customer }
interface Group { title: string; items: Opt[] }

/** Context-ranked location combobox (spec §3/§4.2). */
@Component({
  selector: 'app-location-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="c-search">
      <div style="position:relative;flex:1">
        <input
          class="c-input" role="combobox" aria-autocomplete="list"
          [attr.aria-expanded]="show() && groups().length > 0"
          [placeholder]="placeholder()"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
          (focus)="show.set(true)"
          (blur)="hideSoon()"
        />
        @if (show() && groups().length) {
          <div class="c-combo" role="listbox">
            @for (g of groups(); track g.title) {
              <div class="c-combo__group">{{ g.title }}</div>
              @for (o of g.items; track o.id) {
                <button class="c-opt" type="button" role="option" (mousedown)="pick(o, $event)">
                  <span class="c-opt__body">
                    <span class="c-opt__name">{{ o.name }} @if (o.isNew) { <span class="c-newtag">New</span> }</span>
                    <span class="c-opt__sub">{{ o.sub }}</span>
                  </span>
                </button>
              }
            }
          </div>
        }
      </div>
      <button class="c-mapbtn" type="button" (click)="mapRequested.emit()">
        <app-icon name="map-pin" [size]="16" /> Map
      </button>
    </div>
  `,
})
export class LocationPicker {
  readonly mode = input.required<'pickup' | 'customer'>();
  readonly placeholder = input('Search…');
  readonly picked = output<{ location: CreateLocation | Customer; isNew: boolean }>();
  readonly mapRequested = output<void>();

  private readonly store = inject(CreateShipmentStore);
  protected readonly query = signal('');
  protected readonly show = signal(false);

  protected readonly groups = computed<Group[]>(() => {
    const q = this.query().trim().toLowerCase();
    const match = (l: { name: string; city: string; address: string }) =>
      !q || l.name.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || l.address.toLowerCase().includes(q);
    const groups: Group[] = [];

    if (this.mode() === 'pickup') {
      const locs = this.store.pickupLocations().filter(match);
      if (locs.length) groups.push({ title: 'Your locations', items: locs.map((l) => this.toOpt(l)) });
    } else {
      const recent = this.store.customers().filter((c) => c.recent && match(c));
      const all = this.store.customers().filter((c) => !c.recent && match(c));
      if (recent.length) groups.push({ title: 'Recent customers', items: recent.map((c) => this.toOpt(c)) });
      if (all.length) groups.push({ title: 'Your customers', items: all.map((c) => this.toOpt(c)) });
    }

    if (q.length >= 2) {
      const typed = this.query().trim();
      const raw: CreateLocation = { id: 'new', name: typed, address: typed, city: typed };
      groups.push({ title: 'Search results', items: [{ id: 'new', name: typed, sub: 'New address', isNew: true, raw }] });
    }
    return groups;
  });

  protected pick(o: Opt, e: Event): void {
    e.preventDefault();
    this.picked.emit({ location: o.raw, isNew: o.isNew });
    this.show.set(false);
    this.query.set('');
  }

  protected hideSoon(): void {
    setTimeout(() => this.show.set(false), 150);
  }

  private toOpt(l: CreateLocation): Opt {
    return { id: l.id, name: l.name, sub: `${l.city} · ${l.address}`, isNew: false, raw: l };
  }
}
