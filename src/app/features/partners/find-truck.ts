import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { Avatar, Icon } from '../../shared/ui';
import { CarrierMap } from '../carriers/carrier-map';
import { AvailableTruck, CarriersStore } from '../carriers/carriers.store';

interface Eta { dayLabel: string; clock: string; nextDay: boolean; relative: string; short: string; }

/**
 * Find-a-truck for a Sales Order — the "Available carriers" map/list experience,
 * scoped to picking one truck to fulfil this order and seeing when it arrives.
 */
@Component({
  selector: 'app-find-truck',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Avatar, CarrierMap],
  templateUrl: './find-truck.html',
  styleUrl: './find-truck.scss',
})
export class FindTruck {
  /** Where the goods are going — frames the ETA copy. */
  readonly destination = input<string>('');

  private readonly store = inject(CarriersStore);
  private readonly toast = inject(ToastService);

  protected readonly view = signal<'map' | 'list'>('map');
  protected readonly query = signal('');
  protected readonly selectedId = signal<string | null>(null);

  protected readonly trucks = this.store.trucks;
  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.trucks().filter(
      (t) => !q || `${t.fleet} ${t.driver} ${t.truckType} ${t.atCity} ${t.headingCity}`.toLowerCase().includes(q),
    );
  });
  protected readonly visibleIds = computed(() => this.visible().map((t) => t.id));
  protected readonly selected = computed(() => this.trucks().find((t) => t.id === this.selectedId()) ?? null);
  protected readonly selectedEta = computed(() => { const t = this.selected(); return t ? this.eta(t) : null; });

  protected select(id: string): void { this.selectedId.set(id); }
  protected clearSel(): void { this.selectedId.set(null); }

  protected assign(): void {
    const t = this.selected();
    if (!t) return;
    const e = this.eta(t);
    this.toast.show(`${t.fleet} assigned · arrives ${e.short.toLowerCase()}`, 'success');
    this.selectedId.set(null);
  }

  /** ETA of a truck reaching the pickup: readiness delay + drive time from its position. */
  protected eta(t: AvailableTruck): Eta {
    const readiness = t.availableIn === 'Now' ? 0 : (parseInt(t.availableIn.replace(/\D+/g, ''), 10) || 0);
    const travelH = Math.max(0.5, t.distanceKm / 55);
    const totalH = readiness + travelH;
    const now = new Date();
    const at = new Date(now.getTime() + totalH * 3_600_000);
    const dayDiff = Math.round((this.startOfDay(at) - this.startOfDay(now)) / 86_400_000);
    const dayLabel = dayDiff <= 0 ? 'Today' : dayDiff === 1 ? 'Tomorrow' : at.toLocaleDateString('en-GB', { weekday: 'long' });
    const clock = at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const relative = totalH < 1 ? 'within the hour' : `~${Math.round(totalH)}h away`;
    return { dayLabel, clock, nextDay: dayDiff >= 1, relative, short: `${dayLabel} ${clock}` };
  }
  private startOfDay(d: Date): number { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }

  protected fmt(n: number): string { return n.toLocaleString('en-US'); }
}
