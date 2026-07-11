import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Button, Icon } from '../../../shared/ui';
import { AuthStore } from '../auth.store';

/** Reset password (spec §8). */
@Component({
  selector: 'app-auth-reset',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'a-step' },
  imports: [Button, Icon],
  template: `
    <h1 class="a-head">Set a new password.</h1>
    <p class="a-sub">Choose a password you'll remember.</p>

    <form (submit)="$event.preventDefault(); submit()">
      <label class="a-field">
        <span class="a-label">New password</span>
        <span class="a-inputwrap">
          <input class="a-control" [type]="show() ? 'text' : 'password'" autocomplete="new-password" placeholder="At least 6 characters"
            [value]="pw()" (input)="pw.set($any($event.target).value)" />
          <button class="a-reveal" type="button" [attr.aria-pressed]="show()" [attr.aria-label]="show() ? 'Hide password' : 'Show password'" (click)="show.set(!show())">
            <app-icon [name]="show() ? 'x' : 'eye'" [size]="18" />
          </button>
        </span>
      </label>

      <div class="a-actions">
        <app-button variant="primary" type="submit" [block]="true" [disabled]="pw().length < 6" [loading]="store.loading()">Save &amp; sign in</app-button>
      </div>
    </form>
  `,
})
export class Reset {
  protected readonly store = inject(AuthStore);
  protected readonly pw = signal('');
  protected readonly show = signal(false);
  protected submit(): void {
    if (this.pw().length >= 6) this.store.resetPassword();
  }
}
