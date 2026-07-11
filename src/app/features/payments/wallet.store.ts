import { computed, inject, Injectable, signal } from '@angular/core';
import { WALLET_API, WalletSnapshot } from '../../core/data/wallet.api';
import { WalletTransaction } from '../../models';

/** Wallet snapshot for the header chip + Payments → Wallet tab. */
@Injectable({ providedIn: 'root' })
export class WalletStore {
  private readonly api = inject(WALLET_API);

  private readonly _snapshot = signal<WalletSnapshot | null>(null);
  readonly loading = signal(false);

  readonly balance = computed(() => this._snapshot()?.balance ?? null);
  readonly transactions = computed(() => this._snapshot()?.transactions ?? []);

  load(force = false): void {
    if (this._snapshot() && !force) return;
    this.loading.set(true);
    this.api.get().subscribe({
      next: (snap) => {
        this._snapshot.set(snap);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Add funds — bumps the balance and records a credit transaction (mock). */
  topUp(amount: number, method: string, atIso: string): void {
    this._snapshot.update((s) => {
      if (!s || amount <= 0) return s;
      const txn: WalletTransaction = {
        id: `WTX-${Math.floor(Math.random() * 1e6)}`,
        type: 'credit',
        amount: { amount, currency: s.balance.currency },
        ref: `Top-up · ${method}`,
        at: atIso,
      };
      return { balance: { ...s.balance, amount: s.balance.amount + amount }, transactions: [txn, ...s.transactions] };
    });
  }
}
