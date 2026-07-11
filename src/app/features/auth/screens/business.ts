import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Button, Icon } from '../../../shared/ui';
import { AuthStore } from '../auth.store';

/** Verify your business — signup step 3 of 3, skippable (spec §6). */
@Component({
  selector: 'app-auth-business',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'a-step' },
  imports: [Button, Icon],
  template: `
    <div class="a-progress" aria-hidden="true">
      <span class="a-progress__seg a-progress__seg--done"></span>
      <span class="a-progress__seg a-progress__seg--done"></span>
      <span class="a-progress__seg a-progress__seg--active"></span>
    </div>

    <h1 class="a-head">Verify your business.</h1>
    <p class="a-sub">You can do this now or later — it's needed before your first shipment dispatches.</p>

    <div class="a-reassure">
      <app-icon name="shield" [size]="18" />
      <span>Verified securely with <strong>Elm</strong> — we never store your credentials.</span>
    </div>

    <form (submit)="$event.preventDefault(); submit()">
      <label class="a-field">
        <span class="a-label">Commercial Registration (CR)</span>
        <input class="a-control" type="text" inputmode="numeric" placeholder="10-digit CR number"
          [value]="cr()" (input)="cr.set($any($event.target).value)" />
      </label>

      <label class="a-field">
        <span class="a-label">VAT number</span>
        <input class="a-control" type="text" inputmode="numeric" placeholder="15-digit VAT number"
          [value]="vat()" (input)="vat.set($any($event.target).value)" />
      </label>

      <div class="a-actions">
        <app-button variant="primary" type="submit" [block]="true" [loading]="store.loading()">Verify &amp; finish</app-button>
      </div>
    </form>

    <button class="a-alt" type="button" (click)="store.skipBusiness()">Skip for now</button>
    <p class="a-hint" style="text-align:center">You'll need a verified CR and VAT before your first shipment can be dispatched.</p>
  `,
})
export class Business {
  protected readonly store = inject(AuthStore);
  protected readonly cr = signal('');
  protected readonly vat = signal('');

  protected submit(): void {
    this.store.verifyBusiness();
  }
}
