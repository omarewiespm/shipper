import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Centered auth shell (spec §1): wordmark, single form card, quiet footnote. */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <div class="al">
      <div class="al__brand">
        <img class="al__logo" src="brand/madar-logo.png" alt="Madar — Logistics Platform" />
      </div>
      <div class="al__card">
        <router-outlet />
      </div>
      <p class="al__foot">A joint venture of Obeikan Digital &amp; Elm.</p>
    </div>
  `,
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {}
