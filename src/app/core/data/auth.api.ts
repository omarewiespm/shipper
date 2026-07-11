import { InjectionToken } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export type Channel = 'phone' | 'email';

export interface AuthApi {
  /** Never reveals existence to the UI beyond routing (phone/signup both → OTP). */
  checkIdentifier(channel: Channel, value: string): Observable<{ exists: boolean }>;
  requestOtp(channel: Channel, value: string): Observable<void>;
  verifyOtp(code: string): Observable<{ ok: boolean }>;
  signInPassword(email: string, password: string): Observable<{ ok: boolean }>;
}

export const AUTH_API = new InjectionToken<AuthApi>('AUTH_API');

/** Demo accounts that "exist"; the mock OTP is 123456. */
const KNOWN_PHONES = new Set(['512345678']);
const KNOWN_EMAILS = new Set(['demo@madar.app']);
const MOCK_OTP = '123456';

export class MockAuthApi implements AuthApi {
  private lag<T>(value: T): Observable<T> {
    return of(value).pipe(delay(environment.mockLatencyMs));
  }

  checkIdentifier(channel: Channel, value: string): Observable<{ exists: boolean }> {
    const exists = channel === 'phone' ? KNOWN_PHONES.has(value) : KNOWN_EMAILS.has(value.toLowerCase());
    return this.lag({ exists });
  }

  requestOtp(): Observable<void> {
    return this.lag(undefined as void);
  }

  verifyOtp(code: string): Observable<{ ok: boolean }> {
    return this.lag({ ok: code === MOCK_OTP });
  }

  signInPassword(_email: string, password: string): Observable<{ ok: boolean }> {
    return this.lag({ ok: password.length > 0 });
  }
}
