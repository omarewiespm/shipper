import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EmptyState } from '../ui';

/**
 * Interim screen for routes not yet built (keeps the shell + nav fully
 * navigable during the milestone build-out). Title comes from route data.
 */
@Component({
  selector: 'app-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyState],
  template: `
    <h1 class="t-h1 ph__title">{{ title() }}</h1>
    <app-empty-state
      icon="package"
      [title]="title() + ' is on the way'"
      body="This screen lands in an upcoming milestone. The shell, navigation and data seam are already wired."
    />
  `,
  styles: [`.ph__title { margin-block-end: var(--sp-4); }`],
})
export class Placeholder {
  /** Bound from route `data.title` via withComponentInputBinding(). */
  readonly title = input('Coming soon');
}
