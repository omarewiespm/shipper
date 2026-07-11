import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Icon } from '../../shared/ui';
import { CreateShipmentStore } from './create.store';

/** Product-type single-select: same control/menu as vehicle types, but radio. */
@Component({
  selector: 'app-product-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="c-multi">
      <div class="c-multi__control" [class.is-open]="open()" role="combobox"
        [attr.aria-expanded]="open()" tabindex="0" (click)="open.set(!open())"
        (keydown.escape)="open.set(false)">
        @if (store.productType()) {
          <span class="c-multi__val">{{ store.productType() }}</span>
        } @else {
          <span class="c-multi__ph">Select a product…</span>
        }
        <app-icon name="chevron-down" [size]="16" class="c-multi__caret" />
      </div>

      @if (open()) {
        <div class="c-backdrop" (click)="open.set(false)"></div>
        <div class="c-menu" role="listbox">
          @for (p of store.products(); track p) {
            <button class="c-menu__opt" type="button" [class.is-sel]="store.productType() === p"
              [attr.aria-selected]="store.productType() === p" (click)="pick(p, $event)">
              <span class="c-menu__radio"></span> {{ p }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ProductSelect {
  protected readonly store = inject(CreateShipmentStore);
  protected readonly open = signal(false);

  protected pick(p: string, e: Event): void {
    e.stopPropagation();
    this.store.productType.set(p);
    this.open.set(false);
  }
}
