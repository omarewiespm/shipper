import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/toast.service';
import { Shipment } from '../../../models';
import { Avatar, ConfirmDialog, Icon, StatusChip } from '../../../shared/ui';
import { SidePanelService } from '../../ai/side-panel.service';

interface Bid { id: string; carrier: string; verified: boolean; withMadar: number; price: number; ago: string; }
type Sort = 'best' | 'lowest' | 'experienced';
interface Pending { kind: 'accept' | 'reject'; bid: Bid; }

const SORTS: { key: Sort; label: string }[] = [
  { key: 'best', label: 'Best value' },
  { key: 'lowest', label: 'Lowest price' },
  { key: 'experienced', label: 'Most experienced' },
];

/** Bidding shipment detail — the board while carriers quote (spot pricing). */
@Component({
  selector: 'app-bidding-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Avatar, StatusChip, ConfirmDialog],
  templateUrl: './bidding-detail.html',
  styleUrl: './bidding-detail.scss',
})
export class BiddingDetailView {
  readonly shipment = input.required<Shipment>();
  readonly receiver = input('');

  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly panel = inject(SidePanelService);

  protected readonly sorts = SORTS;
  protected readonly sort = signal<Sort>('best');
  protected readonly pending = signal<Pending | null>(null);
  private readonly _bids = signal<Bid[]>(SEED);

  protected readonly bids = computed(() => {
    const list = [...this._bids()];
    switch (this.sort()) {
      case 'lowest': return list.sort((a, b) => a.price - b.price);
      case 'experienced': return list.sort((a, b) => b.withMadar - a.withMadar);
      default: return list.sort((a, b) => this.score(b) - this.score(a));
    }
  });

  private score(b: Bid): number {
    const prices = this._bids().map((x) => x.price);
    const exps = this._bids().map((x) => x.withMadar);
    const min = Math.min(...prices), max = Math.max(...prices), maxExp = Math.max(...exps, 1);
    const priceNorm = max === min ? 0 : (b.price - min) / (max - min);
    return 0.7 * (1 - priceNorm) + 0.3 * (b.withMadar / maxExp);
  }
  protected readonly bestId = computed(() => {
    let best: string | null = null, bs = -Infinity;
    for (const b of this._bids()) { const s = this.score(b); if (s > bs) { bs = s; best = b.id; } }
    return best;
  });

  protected readonly total = computed(() => this._bids().length);
  protected readonly lowest = computed(() => this._bids().length ? Math.min(...this._bids().map((b) => b.price)) : null);
  protected readonly highest = computed(() => this._bids().length ? Math.max(...this._bids().map((b) => b.price)) : null);

  protected setSort(s: Sort): void { this.sort.set(s); }
  protected fmt(n: number | null): string { return n == null ? '—' : n.toLocaleString('en-US'); }
  protected weight(): string {
    const kg = this.shipment().cargo.weightKg;
    return kg >= 1000 ? `${(kg / 1000).toLocaleString('en-US')} t` : `${kg} kg`;
  }

  protected askAccept(b: Bid): void { this.pending.set({ kind: 'accept', bid: b }); }
  protected askReject(b: Bid): void { this.pending.set({ kind: 'reject', bid: b }); }
  protected cancel(): void { this.pending.set(null); }
  protected confirm(): void {
    const p = this.pending();
    if (!p) return;
    this.pending.set(null);
    if (p.kind === 'accept') {
      this.toast.show(`Accepted bid from ${p.bid.carrier}`, 'success');
      this.router.navigate(['/shipments']);
    } else {
      this._bids.update((l) => l.filter((b) => b.id !== p.bid.id));
      this.toast.show('Bid rejected');
    }
  }
  protected chat(b: Bid): void { this.panel.open('messages'); }
  protected viewCarrier(b: Bid): void { this.toast.show(`${b.carrier} profile — coming soon`); }

  protected acceptMsg(): string {
    const p = this.pending();
    return p ? `This locks the price at SAR ${this.fmt(p.bid.price)} and assigns ${p.bid.carrier}. The shipment moves to in-progress.` : '';
  }
  protected rejectMsg(): string {
    const p = this.pending();
    return p ? `This removes ${p.bid.carrier}'s bid from the list.` : '';
  }
}

const SEED: Bid[] = [
  { id: 'B1', carrier: 'Iron Clad Arabia', verified: true, withMadar: 128, price: 5200, ago: '8m ago' },
  { id: 'B2', carrier: 'Al Rajhi Transport', verified: true, withMadar: 342, price: 5450, ago: '21m ago' },
  { id: 'B3', carrier: 'Desert Line Logistics', verified: false, withMadar: 41, price: 4980, ago: '35m ago' },
  { id: 'B4', carrier: 'Modern Fleet Est.', verified: true, withMadar: 87, price: 5600, ago: '1h ago' },
];
