import { HttpClient } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { mockGet } from './mock-http';

/** Home (reporting) snapshot. Swap the provider to hit real reporting later. */
export interface HomeSnapshot {
  attention: {
    pendingDeliveryNotes: number;
    priceChanges: number;
    invoicesDue: number;
  };
  status: {
    total: number;
    totalThisMonth: number;
    onTimePct: number;
    rows: { label: string; count: number; color: string }[];
  };
  volume: { labels: string[]; values: number[] };
  spend: { labels: string[]; values: number[] };
  onTime: { labels: string[]; values: number[] };
  lanes: { label: string; value: number }[];
  receivers: { id: string; name: string; count: number; lane: string }[];
}

export interface HomeApi {
  get(): Observable<HomeSnapshot>;
}

export const HOME_API = new InjectionToken<HomeApi>('HOME_API');

export class MockHomeApi implements HomeApi {
  private readonly http = inject(HttpClient);

  get(): Observable<HomeSnapshot> {
    return mockGet<HomeSnapshot>(this.http, 'home.json');
  }
}
