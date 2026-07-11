import { HttpClient } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { map, Observable } from 'rxjs';
import { mockGet } from './mock-http';

/** Shipper-facing bid — NO fleet/driver economics are ever exposed. */
export interface Bid {
  id: string;
  carrierName: string;
  verified: boolean;
  shipmentsWithMadar: number;
  bidPrice: number;
  timestamp: string;
}

export interface BiddingDetail {
  id: string;
  receiverName: string;
  pickup: { city: string; address: string };
  dropoff: { city: string; address: string };
  tags: {
    vehicleType?: string;
    product?: string;
    pickupAt?: string;
    deliveryAt?: string;
  };
  /** Soft, non-binding window; the store turns this into a live countdown. */
  closesInMinutes: number;
  bids: Bid[];
}

export interface BiddingApi {
  getById(id: string): Observable<BiddingDetail>;
}

export const BIDDING_API = new InjectionToken<BiddingApi>('BIDDING_API');

export class MockBiddingApi implements BiddingApi {
  private readonly http = inject(HttpClient);

  getById(id: string): Observable<BiddingDetail> {
    return mockGet<BiddingDetail>(this.http, 'bidding-detail.json').pipe(
      map((d) => ({ ...d, id })),
    );
  }
}
