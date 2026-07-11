import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Badge } from '../badge/badge';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

/**
 * Underline tabs (UI spec §3.6). Active = navy text + 2px navy underline.
 * Optional count suffix in a neutral pill. Orange stays out of tabs.
 * `selected` is a two-way model.
 */
@Component({
  selector: 'app-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge],
  template: `
    <div class="tabs" role="tablist">
      @for (tab of items(); track tab.id) {
        <button
          class="tabs__tab"
          role="tab"
          type="button"
          [class.is-active]="tab.id === selected()"
          [attr.aria-selected]="tab.id === selected()"
          (click)="selected.set(tab.id)"
        >
          {{ tab.label }}
          @if (tab.count != null) {
            <app-badge [count]="tab.count" variant="neutral" [hideZero]="false" />
          }
        </button>
      }
    </div>
  `,
  styleUrl: './tabs.scss',
})
export class Tabs {
  readonly items = input.required<TabItem[]>();
  readonly selected = model.required<string>();
}
