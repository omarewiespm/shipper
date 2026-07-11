import { HttpClient } from '@angular/common/http';
import { delay, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Reads a seeded JSON file from public/mock with a small simulated latency so
 * loading/skeleton states are exercised. Real domain services will replace the
 * whole implementation with a plain `http.get(endpoint)` — consumers unchanged.
 */
export function mockGet<T>(http: HttpClient, file: string): Observable<T> {
  // Resolve against the document base (`<base href>`) so the app works when
  // served from a sub-path such as GitHub Pages' `/shipper/`, not just root.
  const url = new URL(`${environment.dataBase}/${file}`, document.baseURI).href;
  return http.get<T>(url).pipe(delay(environment.mockLatencyMs));
}
