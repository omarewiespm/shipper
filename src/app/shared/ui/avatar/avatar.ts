import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Avatar (UI spec §3.12). Shows a glyph when `icon` is set, otherwise initials.
 * Circle by default; `square` gives the ship-again rail's rounded-square variant.
 */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (icon()) {
      <app-icon [name]="icon()!" [size]="size() * 0.5" />
    } @else {
      {{ initials() }}
    }
  `,
  host: {
    class: 'avatar',
    '[class.avatar--square]': 'square()',
    '[attr.data-tone]': 'tone()',
    '[style.inline-size.px]': 'size()',
    '[style.block-size.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.36',
    '[attr.aria-hidden]': 'true',
  },
  styleUrl: './avatar.scss',
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input(38);
  readonly square = input(false);
  readonly tone = input<'navy' | 'neutral' | 'info'>('navy');
  readonly icon = input<IconName | null>(null);

  protected readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join(''),
  );
}
