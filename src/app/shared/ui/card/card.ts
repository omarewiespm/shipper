import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Card (UI spec §3.2). White, 1px line, radius 16, soft shadow, padding 20.
 * Optional header (title + projected `[actions]`). `interactive` adds hover lift.
 */
@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (heading()) {
      <header class="card__head">
        <h3 class="t-h3">{{ heading() }}</h3>
        <span class="card__actions"><ng-content select="[actions]" /></span>
      </header>
    }
    <ng-content />
  `,
  host: {
    class: 'card',
    '[class.card--interactive]': 'interactive()',
    '[class.card--pad-compact]': 'compact()',
  },
  styleUrl: './card.scss',
})
export class Card {
  readonly heading = input<string | null>(null);
  readonly interactive = input(false);
  readonly compact = input(false);
}
