import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { FleetChatDrawer } from './fleet-chat-drawer';
import { FleetMap } from './fleet-map';
import { TrackingDetailDrawer } from './tracking-detail-drawer';
import { LiveShipment, TrackingStore } from './tracking.store';

/** Live tracking: full-width Leaflet map; a truck opens a card → chat / details. */
@Component({
  selector: 'app-tracking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FleetMap, TrackingDetailDrawer, FleetChatDrawer],
  templateUrl: './tracking.html',
  styleUrl: './tracking.scss',
})
export class Tracking {
  protected readonly store = inject(TrackingStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly detailId = signal<string | null>(null);
  protected readonly chatId = signal<string | null>(null);

  protected readonly detailShipment = computed(() => this.find(this.detailId()));
  protected readonly chatShipment = computed(() => this.find(this.chatId()));

  private find(id: string | null): LiveShipment | null {
    return this.store.live().find((s) => s.id === id) ?? null;
  }

  protected openDetail(id: string): void { this.detailId.set(id); }
  protected closeDetail(): void { this.detailId.set(null); }
  protected openChat(id: string): void { this.chatId.set(id); }
  protected closeChat(): void { this.chatId.set(null); }

  protected call(): void {
    const s = this.detailShipment();
    if (s) this.toast.show(`Calling ${s.driver.name}…`);
  }
  protected share(): void {
    this.toast.show('Live tracking link copied', 'success');
  }
  protected viewShipment(): void {
    const s = this.detailShipment();
    if (s) this.router.navigate(['/shipments', s.id]);
  }
}
