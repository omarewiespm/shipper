import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Count badge. Orange pill with white number for attention counts (nav items,
 * messages); neutral (grey) for non-attention counts such as tab suffixes.
 */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ count() }}`,
  host: {
    class: 'badge',
    '[class.badge--neutral]': 'variant() === "neutral"',
    '[hidden]': 'count() === 0 && hideZero()',
  },
  styleUrl: './badge.scss',
})
export class Badge {
  readonly count = input.required<number>();
  readonly variant = input<'primary' | 'neutral'>('primary');
  readonly hideZero = input(true);
}
