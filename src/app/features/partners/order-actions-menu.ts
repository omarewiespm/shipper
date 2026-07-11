import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MenuStateService } from '../../core/menu-state.service';
import { Icon } from '../../shared/ui';
import { Order } from './orders.store';

const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
];

/** Per-row ⋮ actions menu for the orders table. */
@Component({
  selector: 'app-order-actions-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkOverlayOrigin, CdkConnectedOverlay, Icon],
  template: `
    <button #trigger type="button" class="oam__btn" cdkOverlayOrigin #origin="cdkOverlayOrigin"
      [class.is-open]="isOpen()" [attr.aria-label]="'Actions for ' + order().id"
      aria-haspopup="menu" [attr.aria-expanded]="isOpen()" (click)="toggle($event)">
      <app-icon name="more-vertical" [size]="18" />
    </button>

    <ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="isOpen()"
      [cdkConnectedOverlayPositions]="positions" [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop" [cdkConnectedOverlayPush]="true"
      (backdropClick)="close()" (detach)="close()">
      <div class="oam__menu" role="menu">
        <button class="oam__item" type="button" role="menuitem" (click)="emit('view')"><app-icon name="eye" [size]="16" /> View order</button>
        @if (order().status === 'created') {
          <button class="oam__item" type="button" role="menuitem" (click)="emit('confirm')"><app-icon name="check" [size]="16" /> Confirm — create SO</button>
        }
        @if (order().shipmentId) {
          <button class="oam__item" type="button" role="menuitem" (click)="emit('track')"><app-icon name="navigation" [size]="16" /> View shipment</button>
        }
        <div class="oam__divider"></div>
        @if (order().status !== 'cancelled' && order().status !== 'done') {
          <button class="oam__item oam__item--danger" type="button" role="menuitem" (click)="emit('cancel')"><app-icon name="x" [size]="16" /> Cancel order</button>
        }
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: inline-flex; }
    .oam__btn { inline-size: 32px; block-size: 32px; display: inline-flex; align-items: center; justify-content: center; border: none; background: none; border-radius: 8px; color: var(--ink-2); transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease); }
    .oam__btn:hover, .oam__btn.is-open { background: #e6eaf1; color: var(--strong); }
    .oam__menu { min-inline-size: 190px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow-lift); padding: 6px; }
    .oam__item { display: flex; align-items: center; gap: 10px; inline-size: 100%; padding: 9px 11px; border: none; background: none; border-radius: 8px; color: var(--strong); font-family: var(--font); font-size: 13px; text-align: start; }
    .oam__item app-icon { color: var(--ink-2); }
    .oam__item:hover { background: var(--line-soft); }
    .oam__item--danger { color: var(--danger); }
    .oam__item--danger app-icon { color: var(--danger); }
    .oam__divider { block-size: 1px; background: var(--line-soft); margin: 6px 4px; }
  `],
})
export class OrderActionsMenu {
  readonly order = input.required<Order>();
  readonly action = output<'view' | 'confirm' | 'track' | 'cancel'>();

  private readonly menu = inject(MenuStateService);
  protected readonly positions = POSITIONS;
  protected readonly menuId = computed(() => `order:${this.order().id}`);

  protected isOpen(): boolean { return this.menu.isOpen(this.menuId()); }
  protected toggle(e: MouseEvent): void { e.stopPropagation(); this.menu.toggle(this.menuId()); }
  protected close(): void { this.menu.close(this.menuId()); }
  protected emit(a: 'view' | 'confirm' | 'track' | 'cancel'): void { this.close(); this.action.emit(a); }
}
