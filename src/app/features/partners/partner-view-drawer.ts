import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { Partner } from '../../core/data/partners.api';
import { Avatar, Icon, StatusChip } from '../../shared/ui';
import { SidePanelService } from '../ai/side-panel.service';

/** Read-only partner profile in a side drawer. */
@Component({
  selector: 'app-partner-view-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon, Avatar, StatusChip],
  template: `
    @if (partner(); as p) {
      <div class="sd-scrim" (click)="closed.emit()"></div>
      <aside class="sd pv" role="dialog" aria-modal="true" [attr.aria-label]="p.name"
        cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (keydown.escape)="closed.emit()">
        <header class="sd__head">
          <app-avatar [name]="p.name" [size]="40" tone="neutral" [square]="true" />
          <div class="pv__id">
            <span class="pv__name">{{ p.name }}</span>
            <span class="pv__rel" [attr.data-tone]="rel().tone">{{ rel().label }}</span>
          </div>
          <button class="sd__close" type="button" aria-label="Close" (click)="closed.emit()"><app-icon name="x" [size]="18" /></button>
        </header>

        <div class="sd__body pv__body">
          <div class="pv__status"><app-status-chip [label]="chip().label" [tone]="chip().tone" /></div>

          <div class="pv__stats">
            <div class="pv__stat"><span class="pv__snum tabular">{{ p.shipments }}</span><span class="pv__slabel">Shipments</span></div>
            <div class="pv__stat"><span class="pv__snum tabular">{{ p.onTimePct }}%</span><span class="pv__slabel">On-time</span></div>
            <div class="pv__stat"><span class="pv__snum tabular">{{ p.openPos }}</span><span class="pv__slabel">Open POs</span></div>
          </div>

          <dl class="pv__kv">
            <div class="pv__row"><dt><app-icon name="pin" [size]="14" /> City</dt><dd>{{ p.city }}</dd></div>
            <div class="pv__row"><dt><app-icon name="user" [size]="14" /> Contact</dt><dd>{{ p.contactName }}</dd></div>
            <div class="pv__row"><dt><app-icon name="phone" [size]="14" /> Phone</dt><dd class="tabular">{{ p.contactPhone }}</dd></div>
            <div class="pv__row"><dt><app-icon name="messages" [size]="14" /> Email</dt><dd>{{ p.contactEmail }}</dd></div>
            @if (p.joinedAt) { <div class="pv__row"><dt><app-icon name="shield" [size]="14" /> On Madar since</dt><dd>{{ p.joinedAt }}</dd></div> }
          </dl>
        </div>

        <div class="pv__foot">
          <button class="pv__btn pv__btn--ghost" type="button" (click)="message()"><app-icon name="messages" [size]="15" /> Message</button>
          <button class="pv__btn pv__btn--primary" type="button" (click)="goShipments()">View shipments <app-icon name="arrow-right" [size]="15" /></button>
        </div>
      </aside>
    }
  `,
  styles: [`
    .pv.sd { inline-size: min(420px, 100vw); }
    .pv__id { flex: 1; min-inline-size: 0; display: flex; flex-direction: column; gap: 3px; }
    .pv__name { font-size: 15px; font-weight: 600; color: var(--strong); }
    .pv__rel { align-self: flex-start; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
    .pv__rel[data-tone='navy'] { background: var(--nav-active); color: var(--navy); }
    .pv__rel[data-tone='gold'] { background: rgba(201,154,58,.14); color: var(--gold); }
    .pv__rel[data-tone='sky'] { background: var(--sky-bg); color: var(--sky); }
    .pv__body { display: flex; flex-direction: column; gap: 16px; padding: var(--sp-4); }
    .pv__stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
    .pv__stat { display: flex; flex-direction: column; gap: 2px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--card); }
    .pv__snum { font-size: 20px; font-weight: 700; color: var(--strong); }
    .pv__slabel { font-size: 11.5px; color: var(--ink-2); }
    .pv__kv { margin: 0; }
    .pv__row { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); padding-block: 10px; border-block-end: 1px solid var(--line-soft); }
    .pv__row:last-child { border-block-end: none; }
    .pv__row dt { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--ink-2); }
    .pv__row dt app-icon { color: var(--ink-3); }
    .pv__row dd { margin: 0; font-size: 13px; font-weight: 500; color: var(--strong); text-align: end; }
    .pv__foot { display: flex; gap: 10px; padding: var(--sp-3) var(--sp-4); border-block-start: 1px solid var(--line); }
    .pv__btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; block-size: 44px; border-radius: 11px; border: 1px solid transparent; font-family: var(--font); font-size: 13.5px; font-weight: 600; }
    .pv__btn--ghost { flex: none; padding-inline: 16px; background: var(--card); border-color: var(--line); color: var(--ink); }
    .pv__btn--ghost:hover { background: var(--line-soft); }
    .pv__btn--primary { background: var(--navy); color: #fff; }
    .pv__btn--primary:hover { background: var(--navy-700); }
    .tabular { font-variant-numeric: tabular-nums; }
  `],
})
export class PartnerViewDrawer {
  readonly partner = input<Partner | null>(null);
  readonly closed = output<void>();

  private readonly router = inject(Router);
  private readonly panel = inject(SidePanelService);

  protected readonly rel = computed(() => {
    switch (this.partner()?.relationship) {
      case 'supplier': return { label: 'Supplier', tone: 'gold' };
      case 'both': return { label: 'Customer & supplier', tone: 'sky' };
      default: return { label: 'Customer', tone: 'navy' };
    }
  });
  protected readonly chip = computed(() => {
    switch (this.partner()?.madarStatus) {
      case 'active': return { label: 'On Madar', tone: 'ok' as const };
      case 'invited': return { label: 'Invited', tone: 'sky' as const };
      default: return { label: 'Not invited', tone: 'neutral' as const };
    }
  });

  protected message(): void { this.closed.emit(); this.panel.open('messages'); }
  protected goShipments(): void { this.closed.emit(); this.router.navigateByUrl('/shipments'); }
}
