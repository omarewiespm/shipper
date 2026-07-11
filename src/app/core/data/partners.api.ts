import { HttpClient } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { mockGet } from './mock-http';

export type PartnerRelationship = 'customer' | 'supplier' | 'both';
export type PartnerMadarStatus = 'active' | 'invited' | 'not_invited';

/** A company you trade with — a customer (you ship to) and/or supplier (you collect from). */
export interface Partner {
  id: string;
  name: string;
  relationship: PartnerRelationship;
  madarStatus: PartnerMadarStatus;
  city: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  shipments: number;
  onTimePct: number;
  openPos: number;
  lastActivity: string;
  joinedAt?: string;
}

export interface PartnersApi {
  list(): Observable<Partner[]>;
}

export const PARTNERS_API = new InjectionToken<PartnersApi>('PARTNERS_API');

export class MockPartnersApi implements PartnersApi {
  private readonly http = inject(HttpClient);
  list(): Observable<Partner[]> {
    return mockGet<Partner[]>(this.http, 'partners.json');
  }
}
