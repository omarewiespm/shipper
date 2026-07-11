import {
  ConnectedPosition,
  Overlay,
  OverlayPositionBuilder,
  OverlayRef,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Directive, ElementRef, inject, input, OnDestroy } from '@angular/core';
import { Tooltip } from './tooltip';

const SHOW_DELAY = 400;

const POSITIONS: Record<'above' | 'end', ConnectedPosition[]> = {
  above: [
    { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 },
    { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
  ],
  end: [
    { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 },
  ],
};

/** Hover/focus tooltip via CDK overlay. `appTooltip` holds the label. */
@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'scheduleShow()',
    '(mouseleave)': 'hide()',
    '(focus)': 'scheduleShow()',
    '(blur)': 'hide()',
  },
})
export class TooltipDirective implements OnDestroy {
  readonly text = input.required<string>({ alias: 'appTooltip' });
  readonly position = input<'above' | 'end'>('above');

  private readonly overlay = inject(Overlay);
  private readonly positionBuilder = inject(OverlayPositionBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private ref?: OverlayRef;
  private timer?: ReturnType<typeof setTimeout>;

  protected scheduleShow(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.show(), SHOW_DELAY);
  }

  protected hide(): void {
    clearTimeout(this.timer);
    this.ref?.detach();
  }

  private show(): void {
    const label = this.text();
    if (!label || this.ref?.hasAttached()) return;

    if (!this.ref) {
      const positionStrategy = this.positionBuilder
        .flexibleConnectedTo(this.host)
        .withPositions(POSITIONS[this.position()]);
      this.ref = this.overlay.create({
        positionStrategy,
        scrollStrategy: this.overlay.scrollStrategies.close(),
      });
    }

    const cmp = this.ref.attach(new ComponentPortal(Tooltip));
    cmp.instance.text = label;
    cmp.changeDetectorRef.detectChanges();
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    this.ref?.dispose();
  }
}
