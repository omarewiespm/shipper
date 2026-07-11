import { HttpClient } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Money, WalletTransaction } from '../../models';
import { mockGet } from './mock-http';

export interface WalletSnapshot {
  balance: Money;
  transactions: WalletTransaction[];
}

export interface WalletApi {
  get(): Observable<WalletSnapshot>;
}

export const WALLET_API = new InjectionToken<WalletApi>('WALLET_API');

export class MockWalletApi implements WalletApi {
  private readonly http = inject(HttpClient);

  get(): Observable<WalletSnapshot> {
    return mockGet<WalletSnapshot>(this.http, 'wallet.json');
  }
}
