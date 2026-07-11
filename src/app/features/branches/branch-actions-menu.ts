import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MenuStateService } from '../../core/menu-state.service';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui';
import { Branch, BranchesStore } from './branches.store';

const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
];

/** Per-row ⋮ actions for a branch. */
@Component({
  selector: 'app-branch-actions-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkOverlayOrigin, CdkConnectedOverlay, Icon],
  template: `
    <button #trigger type="button" class="bam__btn" cdkOverlayOrigin #origin="cdkOverlayOrigin"
      [class.is-open]="isOpen()" [attr.aria-label]="'Actions for ' + branch().name"
      aria-haspopup="menu" [attr.aria-expanded]="isOpen()" (click)="toggle($event)" (keydown)="onKeydown($event)">
      <app-icon name="more-vertical" [size]="18" />
    </button>

    <ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="isOpen()"
      [cdkConnectedOverlayPositions]="positions" [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop" [cdkConnectedOverlayPush]="true"
      (backdropClick)="close()" (detach)="close()">
      <div class="bam__menu" role="menu">
        <button class="bam__item" type="button" role="menuitem" (click)="viewDetails()"><app-icon name="eye" [size]="16" /> View details</button>
        @if (!branch().primary) {
          <button class="bam__item" type="button" role="menuitem" (click)="setPrimary()"><app-icon name="check" [size]="16" /> Set as primary</button>
        }
        @if (branch().status === 'active') {
          <button class="bam__item" type="button" role="menuitem" (click)="setActive(false)"><app-icon name="minus" [size]="16" /> Deactivate</button>
        } @else {
          <button class="bam__item" type="button" role="menuitem" (click)="setActive(true)"><app-icon name="check" [size]="16" /> Activate</button>
        }
        @if (!branch().primary) {
          <div class="bam__divider"></div>
          <button class="bam__item bam__item--danger" type="button" role="menuitem" (click)="remove()"><app-icon name="x" [size]="16" /> Remove branch</button>
        }
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: inline-flex; }
    .bam__btn { inline-size: 32px; block-size: 32px; display: inline-flex; align-items: center; justify-content: center; border: none; background: none; border-radius: 8px; color: var(--ink-2); }
    .bam__btn:hover, .bam__btn.is-open { background: #e6eaf1; color: var(--strong); }
    .bam__menu { min-inline-size: 190px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow-lift); padding: 6px; animation: bam-in 120ms var(--ease); }
    @keyframes bam-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .bam__menu { animation: none; } }
    .bam__item { display: flex; align-items: center; gap: 10px; inline-size: 100%; padding: 9px 11px; border: none; background: none; border-radius: 8px; color: var(--strong); font-family: var(--font); font-size: 13px; text-align: start; }
    .bam__item app-icon { color: var(--ink-2); }
    .bam__item:hover { background: var(--line-soft); }
    .bam__item--danger { color: var(--danger); }
    .bam__item--danger app-icon { color: var(--danger); }
    .bam__divider { block-size: 1px; background: var(--line-soft); margin: 6px 4px; }
  `],
})
export class BranchActionsMenu {
  readonly branch = input.required<Branch>();

  private readonly menu = inject(MenuStateService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly store = inject(BranchesStore);

  protected readonly positions = POSITIONS;
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  protected readonly menuId = computed(() => `branch:${this.branch().id}`);

  protected isOpen(): boolean { return this.menu.isOpen(this.menuId()); }
  protected toggle(e: MouseEvent): void { e.stopPropagation(); this.menu.toggle(this.menuId()); }
  protected onKeydown(e: KeyboardEvent): void { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }
  protected close(): void { this.menu.close(this.menuId()); }

  protected viewDetails(): void { this.close(); this.router.navigate(['/settings/branches', this.branch().id]); }
  protected setPrimary(): void { this.close(); this.store.setPrimary(this.branch().id); this.toast.show(`${this.branch().name} is now your primary branch`, 'success'); }
  protected setActive(active: boolean): void { this.close(); this.store.setActive(this.branch().id, active); this.toast.show(`${this.branch().name} ${active ? 'activated' : 'deactivated'}`); }
  protected remove(): void { this.close(); this.store.remove(this.branch().id); this.toast.show(`${this.branch().name} removed`); }
}
