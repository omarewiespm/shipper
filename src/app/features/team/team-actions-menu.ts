import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, inject, input, viewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { MenuStateService } from '../../core/menu-state.service';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui';
import { Member, TeamStore } from './team.store';

const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
];

/** Per-row ⋮ actions for a team member. */
@Component({
  selector: 'app-team-actions-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkOverlayOrigin, CdkConnectedOverlay, Icon],
  template: `
    <button #trigger type="button" class="tam__btn" cdkOverlayOrigin #origin="cdkOverlayOrigin"
      [class.is-open]="isOpen()" [attr.aria-label]="'Actions for ' + member().name"
      aria-haspopup="menu" [attr.aria-expanded]="isOpen()"
      (click)="toggle($event)" (keydown)="onKeydown($event)">
      <app-icon name="more-vertical" [size]="18" />
    </button>

    <ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="isOpen()"
      [cdkConnectedOverlayPositions]="positions" [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop" [cdkConnectedOverlayPush]="true"
      (backdropClick)="close()" (detach)="close()">
      <div class="tam__menu" role="menu">
        <button class="tam__item" type="button" role="menuitem" (click)="viewDetails()"><app-icon name="eye" [size]="16" /> View details</button>
        @if (member().status === 'pending') {
          <button class="tam__item" type="button" role="menuitem" (click)="resend()"><app-icon name="send" [size]="16" /> Resend invitation</button>
          <button class="tam__item" type="button" role="menuitem" (click)="approve()"><app-icon name="check" [size]="16" /> Approve access</button>
        }
        @if (member().role !== 'owner') {
          <div class="tam__divider"></div>
          <button class="tam__item tam__item--danger" type="button" role="menuitem" (click)="remove()"><app-icon name="x" [size]="16" /> Remove member</button>
        }
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: inline-flex; }
    .tam__btn { inline-size: 32px; block-size: 32px; display: inline-flex; align-items: center; justify-content: center; border: none; background: none; border-radius: 8px; color: var(--ink-2); }
    .tam__btn:hover, .tam__btn.is-open { background: #e6eaf1; color: var(--strong); }
    .tam__menu { min-inline-size: 190px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow-lift); padding: 6px; animation: tam-in 120ms var(--ease); }
    @keyframes tam-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .tam__menu { animation: none; } }
    .tam__item { display: flex; align-items: center; gap: 10px; inline-size: 100%; padding: 9px 11px; border: none; background: none; border-radius: 8px; color: var(--strong); font-family: var(--font); font-size: 13px; text-align: start; }
    .tam__item app-icon { color: var(--ink-2); }
    .tam__item:hover { background: var(--line-soft); }
    .tam__item--danger { color: var(--danger); }
    .tam__item--danger app-icon { color: var(--danger); }
    .tam__divider { block-size: 1px; background: var(--line-soft); margin: 6px 4px; }
  `],
})
export class TeamActionsMenu {
  readonly member = input.required<Member>();

  private readonly menu = inject(MenuStateService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly store = inject(TeamStore);

  protected readonly positions = POSITIONS;
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  protected readonly menuId = computed(() => `member:${this.member().id}`);

  protected isOpen(): boolean { return this.menu.isOpen(this.menuId()); }
  protected toggle(e: MouseEvent): void { e.stopPropagation(); this.menu.toggle(this.menuId()); }
  protected onKeydown(e: KeyboardEvent): void { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }
  protected close(): void { this.menu.close(this.menuId()); }

  protected viewDetails(): void { this.close(); this.router.navigate(['/settings/users', this.member().id]); }
  protected resend(): void { this.close(); this.toast.show(`Invitation re-sent to ${this.member().email}`); }
  protected approve(): void { this.close(); this.store.approve(this.member().id); this.toast.show(`${this.member().name} approved`, 'success'); }
  protected remove(): void { this.close(); this.store.remove(this.member().id); this.toast.show(`${this.member().name} removed`); }
}
