import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button, Icon } from '../../../shared/ui';
import { AuthStore } from '../auth.store';

/** Password — returning email users (spec §3). */
@Component({
  selector: 'app-auth-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'a-step' },
  imports: [Button, Icon],
  template: `
    <button class="a-back" type="button" (click)="back()"><app-icon name="arrow-left" [size]="15" /> Back</button>
    <h1 class="a-head">Welcome back.</h1>

    <div class="a-chip">
      <span class="a-chip__tile"><app-icon name="user" [size]="18" /></span>
      <span class="a-chip__id">
        <span class="a-chip__cap">Signing in</span>
        <span class="a-chip__val">{{ store.identifier()?.value }}</span>
      </span>
      <button class="a-chip__change" type="button" (click)="back()">Change</button>
    </div>

    <form (submit)="$event.preventDefault(); submit()">
      <label class="a-field">
        <span class="a-label">Password</span>
        <span class="a-inputwrap">
          <input
            class="a-control"
            [class.a-control--error]="!!store.error()"
            [type]="show() ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="Your password"
            [value]="pw()"
            (input)="pw.set($any($event.target).value); store.error.set(null)"
            aria-describedby="pw-err"
          />
          <button class="a-reveal" type="button" [attr.aria-pressed]="show()" [attr.aria-label]="show() ? 'Hide password' : 'Show password'" (click)="show.set(!show())">
            <app-icon [name]="show() ? 'x' : 'eye'" [size]="18" />
          </button>
        </span>
      </label>

      @if (store.error()) { <span class="a-error" id="pw-err" role="alert">{{ store.error() }}</span> }

      <div class="a-passrow">
        <label class="a-check"><input type="checkbox" [checked]="keep()" (change)="keep.set($any($event.target).checked)" /> Keep me signed in</label>
        <button class="a-chip__change" type="button" (click)="forgot()">Forgot password?</button>
      </div>

      <div class="a-actions">
        <app-button variant="primary" type="submit" [block]="true" [loading]="store.loading()">Sign in</app-button>
      </div>
    </form>

    <button class="a-alt" type="button" (click)="store.useCodeInstead()">Email me a one-time code instead</button>
  `,
})
export class Password {
  protected readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly pw = signal('');
  protected readonly show = signal(false);
  protected readonly keep = signal(true);

  protected submit(): void {
    this.store.signInPassword(this.pw());
  }
  protected forgot(): void {
    this.router.navigate(['/auth/forgot']);
  }
  protected back(): void {
    this.store.error.set(null);
    this.router.navigate(['/auth/identifier']);
  }
}
