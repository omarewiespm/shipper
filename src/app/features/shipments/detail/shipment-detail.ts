import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, EmptyState, Skeleton } from '../../../shared/ui';
import { ReceiversStore } from '../../receivers/receivers.store';
import { ShipmentsStore } from '../shipments.store';
import { BiddingDetailView } from './bidding-detail';
import { FixedDetailView } from './fixed-detail';

/**
 * Shipment detail route target. Loads the shipment and renders one of two clean
 * views: the bidding board (marketplace shipment still collecting bids) or the
 * fixed/assigned lifecycle view (everything else, from placed → delivered).
 */
@Component({
  selector: 'app-shipment-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Button, Skeleton, EmptyState, FixedDetailView, BiddingDetailView],
  templateUrl: './shipment-detail.html',
  styleUrl: './shipment-detail.scss',
})
export class ShipmentDetail implements OnInit {
  readonly id = input.required<string>();

  protected readonly shipments = inject(ShipmentsStore);
  private readonly receivers = inject(ReceiversStore);

  protected readonly shipment = computed(() => this.shipments.byId(this.id()));
  protected readonly receiverName = computed(() => {
    const s = this.shipment();
    return s ? (this.receivers.byId(s.receiverId)?.name ?? s.receiverId) : '';
  });
  /** A marketplace shipment still posted is in the bidding phase. */
  protected readonly isBidding = computed(() => {
    const s = this.shipment();
    return !!s && s.status === 'posted' && s.capacitySource === 'marketplace';
  });

  ngOnInit(): void {
    this.shipments.load();
    this.receivers.load();
  }
}
