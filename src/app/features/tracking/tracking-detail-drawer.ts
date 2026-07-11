import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Avatar, Icon } from '../../shared/ui';
import { RouteMap } from './route-map';
import { LiveShipment, TrackingStore } from './tracking.store';

/** Side drawer with the full live detail for one truck/shipment. */
@Component({
  selector: 'app-tracking-detail-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon, Avatar, RouteMap],
  templateUrl: './tracking-detail-drawer.html',
  styleUrl: './tracking-detail-drawer.scss',
})
export class TrackingDetailDrawer {
  private readonly store = inject(TrackingStore);

  readonly shipment = input<LiveShipment | null>(null);
  readonly closed = output<void>();
  readonly call = output<void>();
  readonly share = output<void>();
  readonly view = output<void>();

  protected readonly metrics = computed(() => {
    const s = this.shipment();
    return s ? this.store.metricsFor(s) : null;
  });
}
