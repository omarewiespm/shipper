import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Skeleton block (UI spec §3.14). Grey block matching final layout, shimmer
 * 1.4s. Compose several to mirror a card/row while first data loads.
 */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: {
    class: 'skeleton',
    '[style.inline-size]': 'width()',
    '[style.block-size]': 'height()',
    '[style.border-radius]': 'radius()',
    '[attr.aria-hidden]': 'true',
  },
  styleUrl: './skeleton.scss',
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('16px');
  readonly radius = input('8px');
}
