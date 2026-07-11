import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Button } from '../../../shared/ui';
import { AuthStore, isValidEmail, isValidPhone } from '../auth.store';

/** Identifier — the single sign-in / sign-up entry (spec §2). */
@Component({
  selector: 'app-auth-identifier',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'a-step' },
  imports: [Button],
  template: `
    <h1 class="a-head">Welcome to Madar</h1>
    <p class="a-sub">Enter your mobile number to sign in or create your account.</p>

    <form (submit)="$event.preventDefault(); submit()">
      @if (mode() === 'phone') {
        <label class="a-field">
          <span class="a-label">Mobile number</span>
          <span class="a-phone" [class.a-phone--error]="!!errorMsg()">
            <span class="a-phone__prefix">+966</span>
            <input
              #phone
              class="a-phone__input"
              type="tel"
              inputmode="numeric"
              autocomplete="tel"
              placeholder="5X XXX XXXX"
              [value]="phoneValue()"
              (input)="phoneValue.set($any($event.target).value); clearError()"
              [attr.aria-invalid]="!!errorMsg()"
              aria-describedby="id-err"
            />
          </span>
        </label>
      } @else {
        <label class="a-field">
          <span class="a-label">Email address</span>
          <input
            #email
            class="a-control"
            [class.a-control--error]="!!errorMsg()"
            type="email"
            autocomplete="email"
            placeholder="you@company.com"
            [value]="emailValue()"
            (input)="emailValue.set($any($event.target).value); clearError()"
            [attr.aria-invalid]="!!errorMsg()"
            aria-describedby="id-err"
          />
        </label>
      }

      @if (errorMsg()) { <span class="a-error" id="id-err" role="alert">{{ errorMsg() }}</span> }

      <div class="a-actions">
        <app-button variant="primary" type="submit" [block]="true" [loading]="store.loading()">Continue</app-button>
      </div>
    </form>

    <button class="a-alt" type="button" (click)="toggleMode()">
      {{ mode() === 'phone' ? 'Use email instead' : 'Use mobile number instead' }}
    </button>

    <p class="a-legal">By continuing you agree to Madar's <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</p>
  `,
})
export class Identifier {
  protected readonly store = inject(AuthStore);

  protected readonly mode = signal<'phone' | 'email'>('phone');
  protected readonly phoneValue = signal('');
  protected readonly emailValue = signal('');
  private readonly localError = signal<string | null>(null);
  protected readonly errorMsg = computed(() => this.localError() ?? this.store.error());

  private readonly phoneEl = viewChild<ElementRef<HTMLInputElement>>('phone');
  private readonly emailEl = viewChild<ElementRef<HTMLInputElement>>('email');

  protected clearError(): void {
    this.localError.set(null);
    this.store.error.set(null);
  }

  protected toggleMode(): void {
    this.mode.update((m) => (m === 'phone' ? 'email' : 'phone'));
    this.clearError();
    queueMicrotask(() =>
      (this.mode() === 'phone' ? this.phoneEl() : this.emailEl())?.nativeElement.focus(),
    );
  }

  protected submit(): void {
    this.clearError();
    if (this.mode() === 'phone') {
      if (!isValidPhone(this.phoneValue())) {
        this.localError.set('Enter a valid Saudi mobile number (starts with 5).');
        return;
      }
      this.store.submitIdentifier('phone', this.phoneValue());
    } else {
      if (!isValidEmail(this.emailValue())) {
        this.localError.set('Enter a valid email address.');
        return;
      }
      this.store.submitIdentifier('email', this.emailValue());
    }
  }
}
