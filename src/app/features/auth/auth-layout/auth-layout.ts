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
    </div>
  `,
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {}
