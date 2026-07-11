import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { logoUrl } from './integrations.store';

/** Brand logo: real favicon on a white tile, falling back to a colored monogram. */
@Component({
  selector: 'app-int-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="il" [style.inline-size.px]="size()" [style.block-size.px]="size()"
      [style.border-radius.px]="radius()">
      @if (url() && !failed()) {
        <img class="il__img" [src]="url()" [attr.alt]="name() + ' logo'" (error)="failed.set(true)" />
      } @else {
        <span class="il__mono" [style.background]="color()" [style.font-size.px]="size() * 0.32">{{ initials() }}</span>
      }
    </span>
  `,
  styles: [`
    :host { display: inline-flex; flex: none; }
    .il { position: relative; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; background: #fff; border: 1px solid var(--line); box-shadow: 0 1px 2px rgba(20,26,46,.06); }
    .il__img { inline-size: 62%; block-size: 62%; object-fit: contain; }
    .il__mono { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; letter-spacing: -0.3px; }
  `],
})
export class IntegrationLogo {
  readonly domain = input('');
  readonly initials = input('');
  readonly color = input('#223267');
  readonly name = input('');
  readonly size = input(48);
  readonly radius = input(13);

  protected readonly failed = signal(false);
  protected readonly url = computed(() => logoUrl(this.domain()));
}
