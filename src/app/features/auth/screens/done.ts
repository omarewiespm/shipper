import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button, Icon } from '../../../shared/ui';
import { AuthStore } from '../auth.store';

/** Done — signup success (spec §7). */
@Component({
  selector: 'app-auth-done',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'a-step' },
  imports: [Button, Icon],
  template: `
    <div class="a-done">
      <span class="a-done__tile"><app-icon name="check" [size]="30" /></span>
      <h1 class="a-head">You're all set.</h1>
      <p class="a-sub">Your account is ready. Let's get your first shipment moving.</p>
      <div class="a-actions">
        <app-button variant="primary" [block]="true" (click)="store.finishSignup()">Go to my dashboard</app-button>
      </div>
    </div>
  `,
})
export class Done {
  protected readonly store = inject(AuthStore);
}
