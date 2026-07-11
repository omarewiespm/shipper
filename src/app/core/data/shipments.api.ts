import { HttpClient } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Shipment, ShipmentDocument } from '../../models';
import { mockGet } from './mock-http';

/**
 * Guarantee the auto-generated documents so the Documents section is consistent
 * regardless of the mock JSON. Both exist from the moment the shipment is created:
 *   - Waybill
 *   - Shipment contract (issued and emailed at creation)
 */
function withDocuments(s: Shipment): Shipment {
  const docs = [...s.documents];

  if (!docs.some((d) => d.type === 'waybill')) {
    const waybill: ShipmentDocument = {
      id: `${s.id}-WB`, shipmentId: s.id, type: 'waybill', issuedAt: s.createdAt, signedBy: 'madar',
    };
    docs.unshift(waybill);
  }

  if (!docs.some((d) => d.type === 'contract')) {
    const contract: ShipmentDocument = {
      id: `${s.id}-CTR`, shipmentId: s.id, type: 'contract', issuedAt: s.createdAt, emailedAt: s.createdAt, signedBy: 'madar',
    };
    const after = docs.findIndex((d) => d.type === 'waybill');
    docs.splice(after + 1, 0, contract);
  }

  return { ...s, documents: docs };
}

/** Typed contract for the Shipments backend. Swap the provider, not consumers. */
export interface ShipmentsApi {
  list(): Observable<Shipment[]>;
  getById(id: string): Observable<Shipment | undefined>;
}

export const SHIPMENTS_API = new InjectionToken<ShipmentsApi>('SHIPMENTS_API');

/** Mock impl — reads public/mock/shipments.json. */
export class MockShipmentsApi implements ShipmentsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<Shipment[]> {
    return mockGet<Shipment[]>(this.http, 'shipments.json').pipe(
      map((all) => all.map(withDocuments)),
    );
  }

  getById(id: string): Observable<Shipment | undefined> {
    return this.list().pipe(map((all) => all.find((s) => s.id === id)));
  }
}
