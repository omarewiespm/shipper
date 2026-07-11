import { HttpClient } from '@angular/common/http';
import { delay, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Reads a seeded JSON file from public/mock with a small simulated latency so
 * loading/skeleton states are exercised. Real domain services will replace the
 * whole implementation with a plain `http.get(endpoint)` — consumers unchanged.
 */
export function mockGet<T>(http: HttpClient, file: string): Observable<T> {
  return http
    .get<T>(`${environment.dataBase}/${file}`)
    .pipe(delay(environment.mockLatencyMs));
}
