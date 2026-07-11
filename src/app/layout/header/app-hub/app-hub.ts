import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Icon } from '../../../shared/ui';
import { AppTile, APPS } from '../header.config';
import { MenuStateService } from '../../../core/menu-state.service';

const MENU_ID = 'appHub';

const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
];

/**
 * App-hub launcher (spec): jump to another Madar app or a connected system.
 * Distinct from the sidebar's Integrations item (which manages connections) —
 * the footer links there.
 */
@Component({
  selector: 'app-app-hub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkOverlayOrigin, CdkConnectedOverlay, Icon],
  templateUrl: './app-hub.html',
  styleUrl: './app-hub.scss',
})
export class AppHub {
  private readonly menu = inject(MenuStateService);
  private readonly router = inject(Router);

  protected readonly positions = POSITIONS;
  protected readonly apps = APPS;

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected isOpen(): boolean {
    return this.menu.isOpen(MENU_ID);
  }

  protected toggle(): void {
    this.menu.toggle(MENU_ID);
  }

  protected close(): void {
    this.menu.close(MENU_ID);
    this.trigger().nativeElement.focus();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  protected openApp(app: AppTile): void {
    if (app.active) return;
    // TODO: navigate to the sibling Madar app (external) when those land.
    this.close();
  }

  protected manageIntegrations(): void {
    this.close();
    this.router.navigateByUrl('/integrations');
  }
}
