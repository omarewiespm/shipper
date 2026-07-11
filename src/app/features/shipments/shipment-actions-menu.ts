import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService } from '../../core/analytics.service';
import { MenuStateService } from '../../core/menu-state.service';
import { ToastService } from '../../core/toast.service';
import { Shipment } from '../../models';
import { Icon } from '../../shared/ui';

const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
];

/**
 * Per-row ⋮ actions menu for the Shipments table. Portaled via CDK overlay so
 * it escapes the table card's overflow:hidden; single-open coordinated with the
 * rest of the app's overlays; the trigger stops propagation so it never fires
 * the row's navigation.
 */
@Component({
  selector: 'app-shipment-actions-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkOverlayOrigin, CdkConnectedOverlay, Icon],
  templateUrl: './shipment-actions-menu.html',
  styleUrl: './shipment-actions-menu.scss',
})
export class ShipmentActionsMenu {
  readonly shipment = input.required<Shipment>();

  private readonly menu = inject(MenuStateService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly analytics = inject(AnalyticsService);

  protected readonly positions = POSITIONS;
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly menuEl = viewChild<ElementRef<HTMLElement>>('menu');

  protected readonly menuId = computed(() => `row:${this.shipment().id}`);
  protected readonly triggerLabel = computed(() => `Actions for ${this.shipment().id}`);

  protected isOpen(): boolean {
    return this.menu.isOpen(this.menuId());
  }

  protected toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.menu.toggle(this.menuId());
  }

  /** Guard the trigger's keyboard activation from bubbling to the row. */
  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation();
    }
  }

  protected close(): void {
    this.menu.close(this.menuId());
    this.trigger().nativeElement.focus();
  }

  protected focusFirst(): void {
    requestAnimationFrame(() => this.options()[0]?.focus());
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const opts = this.options();
    if (!opts.length) return;
    const cur = opts.indexOf(document.activeElement as HTMLElement);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    opts[(cur + delta + opts.length) % opts.length].focus();
  }

  private options(): HTMLElement[] {
    const el = this.menuEl()?.nativeElement;
    return el ? Array.from(el.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')) : [];
  }

  // --- Actions -------------------------------------------------------------
  protected viewDetails(): void {
    this.emit('view_details');
    this.close();
    this.router.navigate(['/shipments', this.shipment().id]);
  }

  protected trackLive(): void {
    this.emit('track_live');
    this.close();
    this.router.navigate(['/tracking'], { queryParams: { shipment: this.shipment().id } });
  }

  protected duplicate(): void {
    this.emit('duplicate');
    this.close();
    this.router.navigate(['/create'], { queryParams: { duplicate: this.shipment().id } });
  }

  protected download(): void {
    this.emit('download_documents');
    this.close();
    this.toast.show('Preparing documents…');
    // TODO: call the documents/export service and stream the download.
  }

  private emit(action: string): void {
    this.analytics.track('shipment_action_clicked', { action, shipmentId: this.shipment().id });
  }
}
