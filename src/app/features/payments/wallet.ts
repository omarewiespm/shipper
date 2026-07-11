import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { Money, WalletTransaction } from '../../models';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { Icon } from '../../shared/ui';
import { WalletStore } from './wallet.store';

type Filter = 'all' | 'credit' | 'debit';

/** Wallet — balance, top-up and a clean transaction history. */
@Component({
  selector: 'app-wallet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon, MoneyPipe],
  templateUrl: './wallet.html',
  styleUrl: './wallet.scss',
})
export class Wallet implements OnInit {
  protected readonly store = inject(WalletStore);
  private readonly toast = inject(ToastService);

  protected readonly filter = signal<Filter>('all');
  protected readonly filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'credit', label: 'Money in' },
    { key: 'debit', label: 'Money out' },
  ];

  protected readonly transactions = computed(() => {
    const f = this.filter();
    return this.store.transactions().filter((t) => f === 'all' || t.type === f);
  });

  private sum(type: WalletTransaction['type']): Money {
    const total = this.store.transactions().filter((t) => t.type === type).reduce((a, t) => a + t.amount.amount, 0);
    return { amount: total, currency: this.store.balance()?.currency ?? 'SAR' };
  }
  protected readonly moneyIn = computed(() => this.sum('credit'));
  protected readonly moneyOut = computed(() => this.sum('debit'));

  // Top-up sheet
  protected readonly topupOpen = signal(false);
  protected readonly topupAmount = signal(1000);
  protected readonly method = signal('Mada');
  protected readonly presets = [500, 1000, 2500, 5000];
  protected readonly methods = ['Mada', 'Bank transfer', 'Visa / Mastercard'];

  ngOnInit(): void { this.store.load(); }

  protected setAmount(v: string): void { const n = +v; if (Number.isFinite(n)) this.topupAmount.set(Math.max(0, Math.round(n))); }
  protected confirmTopup(): void {
    const amt = this.topupAmount();
    if (amt <= 0) return;
    this.store.topUp(amt, this.method(), new Date().toISOString());
    this.topupOpen.set(false);
    this.toast.show(`Added SAR ${amt.toLocaleString()} to your wallet`, 'success');
  }
  protected withdraw(): void { this.toast.show('Payout requested — funds arrive in 1–2 business days'); }

  protected dt(iso: string): string {
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
}
