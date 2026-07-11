import { ChangeDetectionStrategy, Component, effect, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Button, Icon } from '../../../shared/ui';
import { AuthStore } from '../auth.store';
import { OtpInput } from '../otp-input/otp-input';

/** OTP — login / signup / reset (spec §4). */
@Component({
  selector: 'app-auth-otp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'a-step' },
  imports: [Button, Icon, OtpInput],
  template: `
    <button class="a-back" type="button" (click)="back()"><app-icon name="arrow-left" [size]="15" /> Back</button>
    <h1 class="a-head">Enter your code.</h1>
    <p class="a-sub">We sent a 6-digit code to <strong>{{ store.destinationLabel() }}</strong>.</p>

    <app-otp-input #otp [error]="!!store.error()" (completed)="code.set($event)" />

    @if (store.error()) { <span class="a-error" role="alert">{{ store.error() }}</span> }

    <div class="a-actions">
      <app-button variant="primary" [block]="true" [loading]="store.loading()" [disabled]="code().length !== 6" (click)="verify()">Verify</app-button>
    </div>

    <p class="a-resend">
      @if (seconds() > 0) {
        Resend in {{ seconds() }}s
      } @else {
        Didn't get it? <button type="button" (click)="resend()">Resend code</button>
      }
    </p>
  `,
})
export class Otp implements OnInit, OnDestroy {
  protected readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly code = signal('');
  protected readonly seconds = signal(30);
  private timer?: ReturnType<typeof setInterval>;
  private readonly otp = viewChild.required(OtpInput);

  constructor() {
    // Clear boxes + refocus whenever a verification error arrives.
    effect(() => {
      if (this.store.error()) {
        this.code.set('');
        this.otp().clear();
      }
    });
  }

  ngOnInit(): void {
    if (!this.store.identifier()) { this.router.navigate(['/auth/identifier']); return; }
    this.startCountdown();
  }
  ngOnDestroy(): void { clearInterval(this.timer); }

  protected verify(): void {
    if (this.code().length === 6) this.store.verifyOtp(this.code());
  }

  protected resend(): void {
    this.store.resendOtp();
    this.code.set('');
    this.otp().clear();
    this.startCountdown();
  }

  protected back(): void {
    this.store.error.set(null);
    this.router.navigate(['/auth/identifier']);
  }

  private startCountdown(): void {
    clearInterval(this.timer);
    this.seconds.set(30);
    this.timer = setInterval(() => {
      this.seconds.update((s) => (s > 0 ? s - 1 : 0));
      if (this.seconds() === 0) clearInterval(this.timer);
    }, 1000);
  }
}
