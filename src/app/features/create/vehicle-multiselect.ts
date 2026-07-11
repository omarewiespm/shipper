import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Icon } from '../../shared/ui';
import { CreateShipmentStore } from './create.store';

/** Vehicle-type multiselect: chips-in-control + checkbox popover (spec §5.1). */
@Component({
  selector: 'app-vehicle-multiselect',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="c-multi">
      <div class="c-multi__control" [class.is-open]="open()" role="combobox"
        [attr.aria-expanded]="open()" tabindex="0" (click)="open.set(!open())"
        (keydown.escape)="open.set(false)">
        @if (!store.vehicleTypes().length) {
          <span class="c-multi__ph">Select vehicle types…</span>
        }
        @for (t of store.vehicleTypes(); track t) {
          <span class="c-vchip">
            <app-icon name="truck" [size]="13" /> {{ t }}
            <button class="c-vchip__x" type="button" [attr.aria-label]="'Remove ' + t" (click)="remove(t, $event)">
              <app-icon name="x" [size]="12" />
            </button>
          </span>
        }
        <app-icon name="chevron-down" [size]="16" class="c-multi__caret" />
      </div>

      @if (open()) {
        <div class="c-backdrop" (click)="open.set(false)"></div>
        <div class="c-menu" role="listbox">
          @for (t of store.allVehicleTypes(); track t) {
            <button class="c-menu__opt" type="button" [class.is-sel]="store.vehicleTypes().includes(t)"
              [attr.aria-selected]="store.vehicleTypes().includes(t)" (click)="pick(t, $event)">
              <app-icon name="truck" [size]="16" /> {{ t }}
              <span class="c-menu__check"><app-icon name="check" [size]="12" /></span>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class VehicleMultiselect {
  protected readonly store = inject(CreateShipmentStore);
  protected readonly open = signal(false);

  protected pick(t: string, e: Event): void {
    e.stopPropagation();
    this.store.toggleVehicle(t);
  }
  protected remove(t: string, e: Event): void {
    e.stopPropagation();
    this.store.removeVehicle(t);
  }
}
