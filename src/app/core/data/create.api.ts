import { HttpClient } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { mockGet } from './mock-http';

export interface CreateLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  primary?: boolean;
}
export interface Contact { name: string; phone: string }
export interface Customer extends CreateLocation {
  recent: boolean;
  contact: Contact | null;
}
export interface Driver { id: string; name: string; truck: string }
export interface Carrier { id: string; name: string; drivers: Driver[] }
export interface RateRow { destinationCity: string; vehicleType: string; rate: number }

export interface CreateData {
  pickupLocations: CreateLocation[];
  customers: Customer[];
  vehicleTypes: string[];
  products: string[];
  carriers: Carrier[];
  rates: RateRow[];
}

export interface CreateApi {
  get(): Observable<CreateData>;
}

export const CREATE_API = new InjectionToken<CreateApi>('CREATE_API');

export class MockCreateApi implements CreateApi {
  private readonly http = inject(HttpClient);
  get(): Observable<CreateData> {
    return mockGet<CreateData>(this.http, 'create-data.json');
  }
}
