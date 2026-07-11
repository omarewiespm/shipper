import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AnalyticsService } from '../../core/analytics.service';
import { AUTH_API, Channel } from '../../core/data/auth.api';
import { SessionService } from '../../core/session.service';

export type OtpPurpose = 'login' | 'signup' | 'reset';

export interface Identifier {
  channel: Channel;
  value: string;
}

/** Normalises a Saudi mobile: strip non-digits, drop a leading 0, keep 5XXXXXXXX. */
export function normalisePhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('966')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
}
export function isValidPhone(raw: string): boolean {
  return /^5\d{8}$/.test(normalisePhone(raw));
}
export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

/**
 * Auth flow state machine (spec §1). Provided at the /auth route so all screens
 * share one instance; drives transitions + navigation, keeps components thin.
 */
@Injectable()
export class AuthStore {
  private readonly api = inject(AUTH_API);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);

  readonly identifier = signal<Identifier | null>(null);
  readonly otpPurpose = signal<OtpPurpose>('login');
  /** True when the signup channel was email → Details must collect a password. */
  readonly emailSignup = signal(false);
  readonly signupName = signal('');
  readonly signupCompany = signal('');

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly destinationLabel = computed(() => {
    const id = this.identifier();
    if (!id) return '';
    return id.channel === 'phone' ? `+966 ${formatPhone(id.value)}` : id.value;
  });

  reset(): void {
    this.identifier.set(null);
    this.error.set(null);
    this.loading.set(false);
  }

  // --- Identifier ----------------------------------------------------------
  submitIdentifier(channel: Channel, value: string): void {
    const normalised = channel === 'phone' ? normalisePhone(value) : value.trim();
    this.identifier.set({ channel, value: normalised });
    this.run(this.api.checkIdentifier(channel, normalised), ({ exists }) => {
      if (exists && channel === 'email') {
        this.analytics.track('auth_identifier_submitted', { channel, outcome: 'login' });
        this.router.navigate(['/auth/password']);
      } else {
        const purpose: OtpPurpose = exists ? 'login' : 'signup';
        this.otpPurpose.set(purpose);
        this.emailSignup.set(!exists && channel === 'email');
        this.analytics.track('auth_identifier_submitted', { channel, outcome: exists ? 'login' : 'signup' });
        this.sendOtpThen('/auth/otp');
      }
    });
  }

  // --- Password ------------------------------------------------------------
  signInPassword(password: string): void {
    const id = this.identifier();
    if (!id) return;
    this.run(this.api.signInPassword(id.value, password), ({ ok }) => {
      if (!ok) { this.error.set('That code or password didn’t work. Try again.'); return; }
      this.succeed();
    });
  }

  useCodeInstead(): void {
    this.otpPurpose.set('login');
    this.sendOtpThen('/auth/otp');
  }

  // --- OTP -----------------------------------------------------------------
  verifyOtp(code: string): void {
    this.run(this.api.verifyOtp(code), ({ ok }) => {
      if (!ok) {
        this.analytics.track('otp_failed', {});
        this.error.set('That code didn’t match. Check and try again.');
        return;
      }
      this.analytics.track('otp_verified', { purpose: this.otpPurpose() });
      switch (this.otpPurpose()) {
        case 'login': this.succeed(); break;
        case 'signup': this.router.navigate(['/auth/details']); break;
        case 'reset': this.router.navigate(['/auth/reset']); break;
      }
    });
  }

  resendOtp(): void {
    this.error.set(null);
    this.api.requestOtp(this.identifier()!.channel, this.identifier()!.value).subscribe();
    this.analytics.track('otp_sent', { purpose: this.otpPurpose(), resend: true });
  }

  // --- Signup: details + business -----------------------------------------
  submitDetails(name: string, company: string): void {
    this.signupName.set(name.trim());
    this.signupCompany.set(company.trim());
    this.router.navigate(['/auth/business']);
  }

  verifyBusiness(): void {
    this.analytics.track('business_verified', {});
    this.router.navigate(['/auth/done']);
  }
  skipBusiness(): void {
    this.analytics.track('business_verification_skipped', {});
    this.router.navigate(['/auth/done']);
  }

  finishSignup(): void {
    this.analytics.track('signup_completed', {});
    this.session.signIn('mock-token', {
      firstRun: true,
      name: this.signupName().split(/\s+/)[0] || 'there',
      company: this.signupCompany() || undefined,
    });
    this.router.navigate(['/home']);
  }

  // --- Forgot / reset ------------------------------------------------------
  forgot(): void {
    this.otpPurpose.set('reset');
    this.sendOtpThen('/auth/otp');
  }
  resetPassword(): void {
    this.succeed();
  }

  // --- Helpers -------------------------------------------------------------
  private succeed(): void {
    this.session.signIn('mock-token');
    this.router.navigate(['/home']);
  }

  private sendOtpThen(route: string): void {
    const id = this.identifier();
    if (!id) return;
    this.run(this.api.requestOtp(id.channel, id.value), () => {
      this.analytics.track('otp_sent', { purpose: this.otpPurpose() });
      this.router.navigate([route]);
    });
  }

  private run<T>(obs: Observable<T>, ok: (v: T) => void): void {
    this.loading.set(true);
    this.error.set(null);
    obs.subscribe({
      next: (v) => { this.loading.set(false); ok(v); },
      error: () => { this.loading.set(false); this.error.set('Something went wrong. Please try again.'); },
    });
  }
}

function formatPhone(v: string): string {
  return v.length === 9 ? `${v.slice(0, 2)} ${v.slice(2, 5)} ${v.slice(5)}` : v;
}
