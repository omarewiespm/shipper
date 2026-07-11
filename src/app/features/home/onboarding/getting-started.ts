import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Icon } from '../../../shared/ui';
import { OnboardingStore } from '../onboarding.store';

/** Getting-started checklist (spec Part Two §3). Prominent in first-run,
 *  demoted + collapsible once a shipment exists. */
@Component({
  selector: 'app-getting-started',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <section class="gs" aria-labelledby="gs-title">
      <header class="gs__head">
        <div class="gs__headrow">
          <h3 class="gs__title" id="gs-title">Getting started</h3>
          <span class="gs__count">
            <span class="gs__n">{{ store.completedSteps() }}</span> of 5 complete
          </span>
          @if (demoted()) {
            <button class="gs__toggle" type="button" [attr.aria-expanded]="expanded()" aria-controls="gs-items"
              [attr.aria-label]="expanded() ? 'Collapse checklist' : 'Expand checklist'" (click)="store.toggleCollapsed()">
              <app-icon name="chevron-down" [size]="18" [class.is-open]="expanded()" />
            </button>
          }
        </div>
        @if (expanded()) {
          <p class="gs__sub">Finish these to get the most out of Madar.</p>
        }
        <div class="gs__bar" role="progressbar" [attr.aria-valuenow]="store.completedSteps()"
          aria-valuemin="0" aria-valuemax="5" [attr.aria-valuetext]="store.completedSteps() + ' of 5 complete'">
          <span class="gs__fill" [style.inline-size.%]="store.completedSteps() / 5 * 100"></span>
        </div>
      </header>

      @if (expanded()) {
        <ol class="gs__items" id="gs-items">
          @for (item of store.checklist(); track item.key) {
            <li>
              @if (item.done) {
                <div class="ci ci--done">
                  <span class="ci__tile ci__tile--done"><app-icon name="check" [size]="15" [stroke]="2" /></span>
                  <span class="ci__body">
                    <span class="ci__t">{{ item.title }}</span>
                    <span class="ci__d">{{ item.description }}</span>
                  </span>
                  <span class="gs__hidden">Completed.</span>
                </div>
              } @else {
                <button class="ci" type="button" (click)="store.completeStep(item.key)">
                  <span class="ci__tile ci__tile--todo"><app-icon [name]="item.icon" [size]="15" [stroke]="1.8" /></span>
                  <span class="ci__body">
                    <span class="ci__t">{{ item.title }}</span>
                    <span class="ci__d">{{ item.description }}</span>
                  </span>
                  <app-icon name="chevron-right" [size]="15" class="ci__chev" />
                </button>
              }
            </li>
          }
        </ol>
      }
    </section>
  `,
  styleUrl: './getting-started.scss',
})
export class GettingStarted {
  readonly demoted = input(false);
  protected readonly store = inject(OnboardingStore);
  protected readonly expanded = computed(() => !this.demoted() || !this.store.collapsed());
}
