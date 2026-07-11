import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CapacitySource } from '../../../models';
import { capacityView } from './status.presenter';

/**
 * Capacity-source tag (UI spec §3.4). Square-cornered, sits beside the status
 * chip on rows: Own carrier (success), Bidding (neutral outline), Rental (info).
 */
@Component({
  selector: 'app-capacity-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="tag" [attr.data-variant]="view().variant">{{ view().label }}</span>`,
  styleUrl: './capacity-tag.scss',
})
export class CapacityTag {
  readonly source = input.required<CapacitySource>();
  protected readonly view = computed(() => capacityView(this.source()));
}
