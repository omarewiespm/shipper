import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../../shared/ui';
import { Order, orderStatusView, orderTypeView } from './orders.store';

type StepState = 'done' | 'active' | 'current' | 'todo';

/** Read-only order detail in a side drawer, with the PO → SO → Shipment pipeline. */
@Component({
  selector: 'app-order-view-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon],
  template: `
    @if (order(); as o) {
      <div class="sd-scrim" (click)="closed.emit()"></div>
      <aside class="sd ovd" role="dialog" aria-modal="true" [attr.aria-label]="o.id"
        cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (keydown.escape)="closed.emit()">
        <header class="sd__head">
          <span class="sd__tile"><app-icon name="receipt" [size]="18" /></span>
          <div class="ovd__id">
            <span class="ovd__num">{{ o.id }}</span>
            <span class="ovd__type" [attr.data-tone]="type().tone">{{ type().label }}</span>
          </div>
          <button class="sd__close" type="button" aria-label="Close" (click)="closed.emit()"><app-icon name="x" [size]="18" /></button>
        </header>

        <div class="sd__body ovd__body">
          <p class="ovd__flow">{{ o.type === 'selling' ? o.partnerName + ' ordered from you — you ship out to them.' : 'You ordered from ' + o.partnerName + ' — they deliver to you.' }}</p>

          <!-- Pipeline -->
          <div class="ovd__pipe">
            @for (s of steps(); track s.label) {
              <div class="ovd__step" [attr.data-state]="s.state">
                <span class="ovd__dot"></span>
                <span class="ovd__l">{{ s.label }}</span>
                <span class="ovd__sub">{{ s.sub }}</span>
              </div>
            }
          </div>

          <dl class="ovd__kv">
            <div class="ovd__row"><dt>Partner</dt><dd>{{ o.partnerName }}</dd></div>
            <div class="ovd__row"><dt>Status</dt><dd>{{ status().label }}</dd></div>
            <div class="ovd__row"><dt>Order value</dt><dd class="tabular">SAR {{ fmt(o.amount) }}</dd></div>
            <div class="ovd__row"><dt>Created</dt><dd>{{ dt(o.createdAt) }}</dd></div>
            @if (o.shipmentId) { <div class="ovd__row"><dt>Shipment</dt><dd class="tabular">{{ o.shipmentId }}</dd></div> }
          </dl>
        </div>

        <div class="ovd__foot">
          @if (o.status !== 'cancelled' && !o.shipmentId) {
            <button class="ovd__btn ovd__btn--primary" type="button" (click)="ship.emit(o)">Create shipment <app-icon name="arrow-right" [size]="15" /></button>
          } @else if (o.shipmentId) {
            <button class="ovd__btn ovd__btn--primary" type="button" (click)="track.emit(o)">View shipment <app-icon name="arrow-right" [size]="15" /></button>
          }
        </div>
      </aside>
    }
  `,
  styles: [`
    .ovd.sd { inline-size: min(440px, 100vw); }
    .ovd__id { flex: 1; min-inline-size: 0; display: flex; align-items: center; gap: 9px; }
    .ovd__num { font-size: 15px; font-weight: 700; color: var(--strong); font-variant-numeric: tabular-nums; }
    .ovd__type { font-size: 10.5px; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
    .ovd__type[data-tone='sky'] { background: var(--sky-bg); color: var(--sky); }
    .ovd__type[data-tone='gold'] { background: rgba(201,154,58,.14); color: var(--gold); }
    .ovd__body { display: flex; flex-direction: column; gap: 18px; padding: var(--sp-4); }
    .ovd__flow { margin: 0; font-size: 13px; color: var(--ink-2); line-height: 1.5; }
    .ovd__pipe { display: flex; align-items: flex-start; }
    .ovd__step { flex: 1; position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
    .ovd__step:not(:first-child)::before { content: ''; position: absolute; inset-block-start: 7px; inset-inline-end: 50%; inline-size: 100%; block-size: 2px; background: var(--line); border-radius: 2px; }
    .ovd__step[data-state='done']::before, .ovd__step[data-state='active']::before, .ovd__step[data-state='current']::before { background: var(--navy); }
    .ovd__dot { inline-size: 16px; block-size: 16px; border-radius: 50%; background: var(--card); border: 2px solid var(--line); z-index: 1; }
    .ovd__step[data-state='done'] .ovd__dot, .ovd__step[data-state='active'] .ovd__dot { background: var(--navy); border-color: var(--navy); }
    .ovd__step[data-state='current'] .ovd__dot { border-color: var(--navy); box-shadow: 0 0 0 4px var(--ring); }
    .ovd__l { font-size: 12px; font-weight: 600; color: var(--strong); }
    .ovd__step[data-state='todo'] .ovd__l { color: var(--ink-3); }
    .ovd__sub { font-size: 10.5px; color: var(--ink-3); }
    .ovd__kv { margin: 0; }
    .ovd__row { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); padding-block: 10px; border-block-end: 1px solid var(--line-soft); }
    .ovd__row:last-child { border-block-end: none; }
    .ovd__row dt { font-size: 13px; color: var(--ink-2); }
    .ovd__row dd { margin: 0; font-size: 13px; font-weight: 600; color: var(--strong); }
    .ovd__foot { display: flex; padding: var(--sp-3) var(--sp-4); border-block-start: 1px solid var(--line); }
    .ovd__foot:empty { display: none; }
    .ovd__btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; block-size: 44px; border-radius: 11px; border: none; font-family: var(--font); font-size: 13.5px; font-weight: 600; }
    .ovd__btn--primary { background: var(--navy); color: #fff; }
    .ovd__btn--primary:hover { background: var(--navy-700); }
    .tabular { font-variant-numeric: tabular-nums; }
  `],
})
export class OrderViewDrawer {
  readonly order = input<Order | null>(null);
  readonly closed = output<void>();
  readonly ship = output<Order>();
  readonly track = output<Order>();

  protected readonly status = computed(() => orderStatusView(this.order()?.status ?? 'created'));
  protected readonly type = computed(() => orderTypeView(this.order()?.type ?? 'selling'));

  protected readonly steps = computed<{ label: string; sub: string; state: StepState }[]>(() => {
    const o = this.order();
    const s = o?.status ?? 'created';
    const so: StepState = s === 'created' ? 'current' : s === 'cancelled' ? 'todo' : 'done';
    const hasShip = !!o?.shipmentId;
    const ship: StepState = s === 'done' ? 'done' : hasShip ? 'active' : s === 'confirmed' ? 'current' : 'todo';
    return [
      { label: 'PO', sub: 'Issued', state: 'done' },
      { label: 'SO', sub: so === 'current' ? 'Awaiting' : 'Confirmed', state: so },
      { label: 'Shipment', sub: hasShip ? o!.shipmentId! : 'Not created', state: ship },
    ];
  });

  protected fmt(n: number): string { return n.toLocaleString('en-US'); }
  protected dt(iso: string): string {
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
}
