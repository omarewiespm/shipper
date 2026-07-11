import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MenuStateService } from '../../core/menu-state.service';
import { Invoice } from '../../models';
import { Icon } from '../../shared/ui';

const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
];

/** Per-row ⋮ actions menu for the invoices table. */
@Component({
  selector: 'app-invoice-actions-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkOverlayOrigin, CdkConnectedOverlay, Icon],
  template: `
    <button #trigger type="button" class="iam__btn" cdkOverlayOrigin #origin="cdkOverlayOrigin"
      [class.is-open]="isOpen()" [attr.aria-label]="'Actions for ' + invoice().id"
      aria-haspopup="menu" [attr.aria-expanded]="isOpen()" (click)="toggle($event)">
      <app-icon name="more-vertical" [size]="18" />
    </button>

    <ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="isOpen()"
      [cdkConnectedOverlayPositions]="positions" [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop" [cdkConnectedOverlayPush]="true"
      (backdropClick)="close()" (detach)="close()">
      <div class="iam__menu" role="menu">
        <button class="iam__item" type="button" role="menuitem" (click)="emit('view')"><app-icon name="eye" [size]="16" /> View invoice</button>
        @if (invoice().status !== 'paid') {
          <button class="iam__item iam__item--pay" type="button" role="menuitem" (click)="emit('pay')"><app-icon name="wallet" [size]="16" /> Pay now</button>
        }
        <div class="iam__divider"></div>
        <button class="iam__item" type="button" role="menuitem" (click)="emit('download')"><app-icon name="download" [size]="16" /> Download</button>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: inline-flex; }
    .iam__btn { inline-size: 32px; block-size: 32px; display: inline-flex; align-items: center; justify-content: center; border: none; background: none; border-radius: 8px; color: var(--ink-2); transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease); }
    .iam__btn:hover, .iam__btn.is-open { background: #e6eaf1; color: var(--strong); }
    .iam__menu { min-inline-size: 196px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow-lift); padding: 6px; transform-origin: top; animation: iam-in 120ms var(--ease); }
    @keyframes iam-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .iam__menu { animation: none; } }
    .iam__item { display: flex; align-items: center; gap: 10px; inline-size: 100%; padding: 9px 11px; border: none; background: none; border-radius: 8px; color: var(--strong); font-family: var(--font); font-size: 13px; text-align: start; }
    .iam__item app-icon { color: var(--ink-2); }
    .iam__item:hover { background: var(--line-soft); }
    /* Pay — navy accent with a light sweep left → right */
    .iam__item--pay { position: relative; overflow: hidden; color: var(--navy); font-weight: 600; }
    .iam__item--pay app-icon { color: var(--navy); }
    .iam__item--pay::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(100deg, transparent 25%, rgba(34, 50, 103, 0.16) 50%, transparent 75%); transform: translateX(-120%); animation: iam-sweep 2.4s ease-in-out infinite; }
    @keyframes iam-sweep { 0% { transform: translateX(-120%); } 55%, 100% { transform: translateX(120%); } }
    @media (prefers-reduced-motion: reduce) { .iam__item--pay::before { animation: none; display: none; } }
    .iam__divider { block-size: 1px; background: var(--line-soft); margin: 6px 4px; }
  `],
})
export class InvoiceActionsMenu {
  readonly invoice = input.required<Invoice>();
  readonly action = output<'view' | 'pay' | 'download'>();

  private readonly menu = inject(MenuStateService);
  protected readonly positions = POSITIONS;
  protected readonly menuId = computed(() => `invoice:${this.invoice().id}`);

  protected isOpen(): boolean { return this.menu.isOpen(this.menuId()); }
  protected toggle(e: MouseEvent): void { e.stopPropagation(); this.menu.toggle(this.menuId()); }
  protected close(): void { this.menu.close(this.menuId()); }
  protected emit(a: 'view' | 'pay' | 'download'): void { this.close(); this.action.emit(a); }
}
