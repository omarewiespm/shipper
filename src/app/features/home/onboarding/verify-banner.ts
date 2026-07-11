import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AnalyticsService } from '../../../core/analytics.service';
import { ToastService } from '../../../core/toast.service';
import { Icon } from '../../../shared/ui';
import { OnboardingStore } from '../onboarding.store';

/** Verify-business nudge (spec Part Two §1). Green = unlock, not error. */
@Component({
  selector: 'app-verify-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <section class="vb" aria-labelledby="vb-title">
      <span class="vb__tile" aria-hidden="true"><app-icon name="shield" [size]="24" [stroke]="1.7" /></span>
      <div class="vb__body">
        <h3 class="vb__title" id="vb-title">Verify your business registration</h3>
        <p class="vb__desc">Confirm your CR and VAT with Elm to unlock shipping. Takes about a minute.</p>
      </div>
      <button class="vb__btn" type="button" [disabled]="pending()" (click)="verify()"
        aria-label="Verify your business registration">
        {{ pending() ? 'Verifying…' : 'Verify now' }}
      </button>
    </section>
  `,
  styleUrl: './verify-banner.scss',
})
export class VerifyBanner {
  protected readonly store = inject(OnboardingStore);
  private readonly analytics = inject(AnalyticsService);
  private readonly toast = inject(ToastService);
  protected readonly pending = () => false;

  protected verify(): void {
    // Demo: mark the business verified — this removes the banner for the rest of
    // the session (it returns only after a fresh sign-in). A real build opens the
    // Elm verification flow and flips `businessVerified` on success.
    this.analytics.track('onboarding_verify_clicked', {});
    this.store.verifyBusiness();
    this.toast.show('Business verified — you’re all set to ship', 'success');
  }
}
