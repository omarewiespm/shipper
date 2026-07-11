import { HttpClient } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Invoice } from '../../models';
import { mockGet } from './mock-http';

export interface InvoicesApi {
  list(): Observable<Invoice[]>;
}

export const INVOICES_API = new InjectionToken<InvoicesApi>('INVOICES_API');

export class MockInvoicesApi implements InvoicesApi {
  private readonly http = inject(HttpClient);

  list(): Observable<Invoice[]> {
    return mockGet<Invoice[]>(this.http, 'invoices.json');
  }
}
