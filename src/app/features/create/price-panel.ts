import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Button, Icon } from '../../shared/ui';
import { CreateShipmentStore } from './create.store';

/** Live summary + price panel (spec §8). Resolves fixed / bidding / incomplete. */
@Component({
  selector: 'app-price-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon],
  template: `
    <aside class="pp">
      <p class="pp__label">Summary</p>
      <dl class="pp__summary">
        <div class="pp__row"><dt>From</dt><dd>{{ store.pickup()?.city ?? '—' }}</dd></div>
        <div class="pp__row"><dt>To</dt><dd>{{ toLabel() }}</dd></div>
        <div class="pp__row"><dt>Vehicle</dt><dd>{{ vehicleLabel() }}</dd></div>
        <div class="pp__row"><dt>Creating</dt><dd>{{ creatingLabel() }}</dd></div>
      </dl>

      <div class="pp__price" aria-live="polite">
        @switch (price().model) {
          @case ('fixed') {
            <span class="pp__badge pp__badge--ok"><app-icon name="check" [size]="13" /> Fixed · contract price</span>
            <div class="pp__figure tabular">SAR {{ fmt(price().total!) }} <span class="pp__figure-sfx">total</span></div>
            <p class="pp__sub">{{ fixedSub() }}</p>
          }
          @case ('bidding') {
            <span class="pp__badge pp__badge--sky"><app-icon name="report" [size]="13" /> Bidding</span>
            <p class="pp__title">No contract rate for this lane</p>
            <p class="pp__sub">{{ store.pickup()?.city }} → {{ store.destinationCity() }} with {{ price().vehicle }} isn't in your rate agreement. Post it for bidding — carriers quote and you accept the best.</p>
          }
          @default {
            <span class="pp__badge pp__badge--muted">Price</span>
            <p class="pp__title">Enter route &amp; vehicle</p>
            <p class="pp__sub">Your contract price appears once we know the destination and truck type.</p>
          }
        }
      </div>

      <div class="pp__actions">
        <app-button variant="primary" [block]="true" [disabled]="!store.canSubmit() || submitting()" [loading]="submitting()" (click)="submit.emit()">
          {{ primaryLabel() }}
        </app-button>
        <app-button variant="ghost" [block]="true" (click)="saveDraft.emit()">Save as draft</app-button>
      </div>
    </aside>
  `,
  styleUrl: './price-panel.scss',
})
export class PricePanel {
  readonly submitting = input(false);
  readonly submit = output<void>();
  readonly saveDraft = output<void>();

  protected readonly store = inject(CreateShipmentStore);
  protected readonly price = this.store.priceState;

  protected readonly toLabel = computed(() => {
    const stops = this.store.stops();
    if (stops.length > 1) return `${stops.length} drop-offs`;
    return this.store.destinationCity() ?? '—';
  });
  protected readonly vehicleLabel = computed(() => this.store.vehicleTypes().join(', ') || '—');
  protected readonly creatingLabel = computed(() => {
    const n = this.store.numberOfShipments();
    return n === 1 ? '1 shipment' : `${n} shipments`;
  });

  protected readonly primaryLabel = computed(() => {
    if (this.price().model === 'bidding') return 'Post for bidding';
    const n = this.store.numberOfShipments();
    return n === 1 ? 'Create shipment' : `Create ${n} shipments`;
  });

  protected readonly fixedSub = computed(() => {
    const p = this.price();
    const n = this.store.numberOfShipments();
    let s = `SAR ${this.fmt(p.rate ?? 0)} · ${this.store.pickup()?.city} → ${this.store.destinationCity()} · ${p.vehicle}`;
    if (n > 1) s += ` · ×${n}`;
    if (this.store.carrierName()) s += ` · to ${this.store.carrierName()}`;
    return s;
  });

  protected fmt(n: number): string {
    return n.toLocaleString('en-US');
  }
}
