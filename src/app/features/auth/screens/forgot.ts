import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button, Icon } from '../../../shared/ui';
import { AuthStore } from '../auth.store';

/** Forgot password (spec §8). */
@Component({
  selector: 'app-auth-forgot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'a-step' },
  imports: [Button, Icon],
  template: `
    <button class="a-back" type="button" (click)="back()"><app-icon name="arrow-left" [size]="15" /> Back</button>
    <h1 class="a-head">Reset your password.</h1>
    <p class="a-sub">We'll send a code to <strong>{{ store.identifier()?.value }}</strong> so you can set a new one.</p>

    <div class="a-actions">
      <app-button variant="primary" [block]="true" [loading]="store.loading()" (click)="store.forgot()">Send code</app-button>
    </div>
  `,
})
export class Forgot {
  protected readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  protected back(): void {
    this.router.navigate(['/auth/password']);
  }
}
