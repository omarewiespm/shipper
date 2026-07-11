import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Empty state (UI spec §3.13). Muted icon + invitation copy + optional action
 * (projected). Copy is an invitation, never "Nothing here".
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="empty">
      @if (icon()) {
        <span class="empty__icon"><app-icon [name]="icon()!" [size]="44" [stroke]="1.5" /></span>
      }
      <h3 class="t-h3 empty__title">{{ title() }}</h3>
      @if (body()) {
        <p class="t-caption empty__body">{{ body() }}</p>
      }
      <div class="empty__action"><ng-content /></div>
    </div>
  `,
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly body = input<string | null>(null);
  readonly icon = input<IconName | null>(null);
}
