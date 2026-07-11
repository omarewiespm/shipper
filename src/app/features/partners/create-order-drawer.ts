import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Icon } from '../../shared/ui';
import { PartnersStore } from './partners.store';
import { OrderType } from './orders.store';

export interface NewOrder { type: OrderType; partnerId: string; partnerName: string; amount: number; }

/** Drawer to raise an order — sell to a customer, or buy from a supplier. */
@Component({
  selector: 'app-create-order-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon],
  template: `
    @if (open()) {
      <div class="sd-scrim" (click)="closed.emit()"></div>
      <aside class="sd cod" role="dialog" aria-modal="true" aria-label="Create order"
        cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (keydown.escape)="closed.emit()">
        <header class="sd__head">
          <span class="sd__tile"><app-icon name="receipt" [size]="18" /></span>
          <span class="sd__title">Create order</span>
          <button class="sd__close" type="button" aria-label="Close" (click)="closed.emit()"><app-icon name="x" [size]="18" /></button>
        </header>

        <div class="sd__body cod__body">
          <!-- What kind of order -->
          <div class="cod__seg" role="tablist">
            <button class="cod__segbtn" [class.is-on]="type() === 'selling'" (click)="setType('selling')" role="tab" [attr.aria-selected]="type() === 'selling'">
              <span class="cod__dot" data-kind="selling"></span> Sell to a customer
            </button>
            <button class="cod__segbtn" [class.is-on]="type() === 'buying'" (click)="setType('buying')" role="tab" [attr.aria-selected]="type() === 'buying'">
              <span class="cod__dot" data-kind="buying"></span> Buy from a supplier
            </button>
          </div>
          <p class="cod__hint">{{ type() === 'selling' ? 'A customer orders from you — you fulfil with an outbound shipment.' : 'You order from a supplier — they deliver with an inbound shipment.' }}</p>

          <!-- Partner -->
          <label class="cod__field">
            <span class="cod__label">{{ type() === 'selling' ? 'Customer' : 'Supplier' }}</span>
            <select class="cod__input" [value]="partnerId()" (change)="partnerId.set($any($event.target).value)">
              <option value="" disabled>Select a {{ type() === 'selling' ? 'customer' : 'supplier' }}…</option>
              @for (p of eligible(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
            </select>
            @if (!eligible().length) { <span class="cod__note">No {{ type() === 'selling' ? 'customers' : 'suppliers' }} yet — add one in the Partners directory.</span> }
          </label>

          <!-- Amount -->
          <label class="cod__field">
            <span class="cod__label">Order value (SAR)</span>
            <input class="cod__input" type="number" inputmode="numeric" min="0" placeholder="0"
              [value]="amount() || ''" (input)="amount.set(+$any($event.target).value)" />
          </label>
        </div>

        <div class="cod__foot">
          <button class="cod__btn cod__btn--ghost" type="button" (click)="closed.emit()">Cancel</button>
          <button class="cod__btn cod__btn--primary" type="button" [disabled]="!canCreate()" (click)="submit()">Create order</button>
        </div>
      </aside>
    }
  `,
  styles: [`
    .cod.sd { inline-size: min(440px, 100vw); }
    .cod__body { display: flex; flex-direction: column; gap: 16px; padding: var(--sp-4); }
    .cod__seg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .cod__segbtn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; block-size: 44px; border: 1px solid var(--line); border-radius: 11px; background: var(--card); font-family: var(--font); font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
    .cod__segbtn.is-on { border-color: var(--navy); background: var(--nav-active); color: var(--navy); }
    .cod__dot { inline-size: 9px; block-size: 9px; border-radius: 50%; flex: none; }
    .cod__dot[data-kind='selling'] { background: var(--sky); }
    .cod__dot[data-kind='buying'] { background: var(--gold); }
    .cod__hint { margin: 0; font-size: 12px; color: var(--ink-2); line-height: 1.5; }
    .cod__field { display: flex; flex-direction: column; gap: 6px; }
    .cod__label { font-size: 12px; font-weight: 600; color: var(--ink-2); }
    .cod__input { block-size: 44px; padding-inline: 12px; border: 1px solid var(--line); border-radius: 11px; background: var(--card); font-family: var(--font); font-size: 14px; color: var(--strong); }
    .cod__input:focus-visible { outline: 2px solid var(--navy); outline-offset: 1px; }
    select.cod__input { appearance: none; background-image: none; }
    .cod__note { font-size: 11.5px; color: var(--ink-3); }
    .cod__foot { display: flex; gap: 10px; padding: var(--sp-3) var(--sp-4); border-block-start: 1px solid var(--line); }
    .cod__btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; block-size: 44px; border-radius: 11px; border: 1px solid transparent; font-family: var(--font); font-size: 13.5px; font-weight: 600; }
    .cod__btn--ghost { flex: none; padding-inline: 18px; background: var(--card); border-color: var(--line); color: var(--ink); }
    .cod__btn--ghost:hover { background: var(--line-soft); }
    .cod__btn--primary { background: var(--navy); color: #fff; }
    .cod__btn--primary:hover { background: var(--navy-700); }
    .cod__btn--primary:disabled { opacity: 0.5; }
  `],
})
export class CreateOrderDrawer {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly created = output<NewOrder>();

  private readonly partners = inject(PartnersStore);

  protected readonly type = signal<OrderType>('selling');
  protected readonly partnerId = signal('');
  protected readonly amount = signal(0);

  protected readonly eligible = computed(() => {
    const want = this.type() === 'selling' ? 'customer' : 'supplier';
    return this.partners.all().filter((p) => p.relationship === want || p.relationship === 'both');
  });
  protected readonly canCreate = computed(() => !!this.partnerId() && this.amount() > 0);

  constructor() {
    effect(() => { if (this.open()) untracked(() => this.reset()); });
    this.partners.load();
  }

  private reset(): void { this.type.set('selling'); this.partnerId.set(''); this.amount.set(0); }
  protected setType(t: OrderType): void { this.type.set(t); this.partnerId.set(''); }

  protected submit(): void {
    const p = this.partners.byId(this.partnerId());
    if (!p) return;
    this.created.emit({ type: this.type(), partnerId: p.id, partnerName: p.name, amount: this.amount() });
  }
}
