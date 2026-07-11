import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button (UI spec §3.1). One primary per view. Focus ring, pressed scale and
 * loading spinner handled here; the accent stays navy (never orange).
 */
@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button
      [type]="type()"
      [class]="'btn btn--' + variant() + ' btn--' + size()"
      [class.btn--block]="block()"
      [class.is-loading]="loading()"
      [disabled]="disabled() || loading()"
    >
      @if (loading()) {
        <span class="btn__spinner" aria-hidden="true"></span>
      } @else if (icon()) {
        <app-icon [name]="icon()!" [size]="size() === 'sm' ? 16 : 18" />
      }
      <span class="btn__label"><ng-content /></span>
    </button>
  `,
  styleUrl: './button.scss',
})
export class Button {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit'>('button');
  readonly icon = input<IconName | null>(null);
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly block = input(false);
}
