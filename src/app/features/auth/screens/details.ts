import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, Icon } from '../../../shared/ui';
import { AuthStore } from '../auth.store';

/** Details — signup step 2 of 3 (spec §5). */
@Component({
  selector: 'app-auth-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'a-step' },
  imports: [Button, Icon],
  template: `
    <div class="a-progress" aria-hidden="true">
      <span class="a-progress__seg a-progress__seg--done"></span>
      <span class="a-progress__seg a-progress__seg--active"></span>
      <span class="a-progress__seg"></span>
    </div>

    <h1 class="a-head">Tell us about you.</h1>
    <p class="a-sub">This is how your account and documents are labelled.</p>

    <form (submit)="$event.preventDefault(); submit()">
      <label class="a-field">
        <span class="a-label">Full name</span>
        <input class="a-control" type="text" autocomplete="name" placeholder="Your name"
          [value]="name()" (input)="name.set($any($event.target).value)" />
      </label>

      <label class="a-field">
        <span class="a-label">Company name</span>
        <input class="a-control" type="text" autocomplete="organization" placeholder="Your company"
          [value]="company()" (input)="company.set($any($event.target).value)" />
      </label>

      @if (store.emailSignup()) {
        <label class="a-field">
          <span class="a-label">Password</span>
          <span class="a-inputwrap">
            <input class="a-control" [type]="show() ? 'text' : 'password'" autocomplete="new-password" placeholder="Create a password"
              [value]="pw()" (input)="pw.set($any($event.target).value)" />
            <button class="a-reveal" type="button" [attr.aria-pressed]="show()" [attr.aria-label]="show() ? 'Hide password' : 'Show password'" (click)="show.set(!show())">
              <app-icon [name]="show() ? 'x' : 'eye'" [size]="18" />
            </button>
          </span>
        </label>
      }

      <div class="a-actions">
        <app-button variant="primary" type="submit" [block]="true" [disabled]="!valid()">Continue</app-button>
      </div>
    </form>
  `,
})
export class Details {
  protected readonly store = inject(AuthStore);
  protected readonly name = signal('');
  protected readonly company = signal('');
  protected readonly pw = signal('');
  protected readonly show = signal(false);

  protected readonly valid = computed(() =>
    this.name().trim().length > 1 &&
    this.company().trim().length > 1 &&
    (!this.store.emailSignup() || this.pw().length >= 6),
  );

  protected submit(): void {
    if (this.valid()) this.store.submitDetails(this.name(), this.company());
  }
}
