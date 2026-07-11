import { HttpClient } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Receiver } from '../../models';
import { mockGet } from './mock-http';

export interface ReceiversApi {
  list(): Observable<Receiver[]>;
  getById(id: string): Observable<Receiver | undefined>;
}

export const RECEIVERS_API = new InjectionToken<ReceiversApi>('RECEIVERS_API');

export class MockReceiversApi implements ReceiversApi {
  private readonly http = inject(HttpClient);

  list(): Observable<Receiver[]> {
    return mockGet<Receiver[]>(this.http, 'receivers.json');
  }

  getById(id: string): Observable<Receiver | undefined> {
    return this.list().pipe(map((all) => all.find((r) => r.id === id)));
  }
}
