import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MenuStateService } from '../../core/menu-state.service';
import { ToastService } from '../../core/toast.service';
import { Partner } from '../../core/data/partners.api';
import { Icon } from '../../shared/ui';
import { SidePanelService } from '../ai/side-panel.service';
import { PartnersStore } from './partners.store';

const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
];

/** Per-row ⋮ actions menu for the partners table (portaled via CDK overlay). */
@Component({
  selector: 'app-partner-actions-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkOverlayOrigin, CdkConnectedOverlay, Icon],
  template: `
    <button #trigger type="button" class="pam__btn" cdkOverlayOrigin #origin="cdkOverlayOrigin"
      [class.is-open]="isOpen()" [attr.aria-label]="'Actions for ' + partner().name"
      aria-haspopup="menu" [attr.aria-expanded]="isOpen()"
      (click)="toggle($event)" (keydown)="onTriggerKeydown($event)">
      <app-icon name="more-vertical" [size]="18" />
    </button>

    <ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="isOpen()"
      [cdkConnectedOverlayPositions]="positions" [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop" [cdkConnectedOverlayPush]="true"
      (backdropClick)="close()" (detach)="close()">
      <div class="pam__menu" role="menu" [attr.aria-label]="'Actions for ' + partner().name">
        <button class="pam__item" type="button" role="menuitem" (click)="doView()"><app-icon name="eye" [size]="16" /> View partner</button>
        @if (partner().madarStatus !== 'active') {
          <button class="pam__item" type="button" role="menuitem" (click)="invite()"><app-icon name="send" [size]="16" /> {{ partner().madarStatus === 'invited' ? 'Resend invite' : 'Invite to Madar' }}</button>
        }
        <button class="pam__item" type="button" role="menuitem" (click)="goShipments()"><app-icon name="package" [size]="16" /> View shipments</button>
        <button class="pam__item" type="button" role="menuitem" (click)="goPos()"><app-icon name="receipt" [size]="16" /> Orders</button>
        <button class="pam__item" type="button" role="menuitem" (click)="message()"><app-icon name="messages" [size]="16" /> Send message</button>
        <div class="pam__divider"></div>
        <button class="pam__item pam__item--danger" type="button" role="menuitem" (click)="remove()"><app-icon name="x" [size]="16" /> Remove partner</button>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: inline-flex; }
    .pam__btn { inline-size: 32px; block-size: 32px; display: inline-flex; align-items: center; justify-content: center; border: none; background: none; border-radius: 8px; color: var(--ink-2); transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease); }
    .pam__btn:hover, .pam__btn.is-open { background: #e6eaf1; color: var(--strong); }
    .pam__menu { min-inline-size: 200px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow-lift); padding: 6px; animation: pam-in 120ms var(--ease); }
    @keyframes pam-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .pam__menu { animation: none; } }
    .pam__item { display: flex; align-items: center; gap: 10px; inline-size: 100%; padding: 9px 11px; border: none; background: none; border-radius: 8px; color: var(--strong); font-family: var(--font); font-size: 13px; text-align: start; }
    .pam__item app-icon { color: var(--ink-2); }
    .pam__item:hover { background: var(--line-soft); }
    .pam__item--danger { color: var(--danger); }
    .pam__item--danger app-icon { color: var(--danger); }
    .pam__divider { block-size: 1px; background: var(--line-soft); margin: 6px 4px; }
  `],
})
export class PartnerActionsMenu {
  readonly partner = input.required<Partner>();
  readonly view = output<Partner>();

  private readonly menu = inject(MenuStateService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly panel = inject(SidePanelService);
  private readonly store = inject(PartnersStore);

  protected readonly positions = POSITIONS;
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  protected readonly menuId = computed(() => `partner:${this.partner().id}`);

  protected isOpen(): boolean { return this.menu.isOpen(this.menuId()); }
  protected toggle(e: MouseEvent): void { e.stopPropagation(); this.menu.toggle(this.menuId()); }
  protected onTriggerKeydown(e: KeyboardEvent): void { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }
  protected close(): void { this.menu.close(this.menuId()); }

  protected doView(): void { this.close(); this.view.emit(this.partner()); }
  protected goShipments(): void { this.close(); this.router.navigateByUrl('/shipments'); }
  protected goPos(): void { this.close(); this.router.navigateByUrl('/partners/po'); }
  protected message(): void { this.close(); this.panel.open('messages'); }
  protected invite(): void {
    this.close();
    const p = this.partner();
    this.store.invite(p.id);
    this.toast.show(`${p.madarStatus === 'invited' ? 'Reminder re-sent to' : 'Invite sent to'} ${p.name}`, 'success');
  }
  protected remove(): void { this.close(); this.toast.show(`Remove ${this.partner().name} — coming soon`); }
}
