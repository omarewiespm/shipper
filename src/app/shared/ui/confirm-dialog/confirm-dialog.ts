import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';

/**
 * Centered confirm modal (UI spec §3.9). Scrim + focus trap; Esc / scrim / the
 * cancel button dismiss. Driven by `open`; emits confirm / cancel.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Button],
  template: `
    @if (open()) {
      <div class="cd__scrim" (click)="cancel.emit()"></div>
      <div
        class="cd"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        (keydown.escape)="cancel.emit()"
      >
        <h2 class="cd__title">{{ title() }}</h2>
        @if (message()) { <p class="cd__msg">{{ message() }}</p> }
        <div class="cd__actions">
          <app-button variant="secondary" (click)="cancel.emit()">{{ cancelLabel() }}</app-button>
          <app-button [variant]="danger() ? 'danger' : 'primary'" (click)="confirm.emit()">{{ confirmLabel() }}</app-button>
        </div>
      </div>
    }
  `,
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly message = input<string | null>(null);
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly danger = input(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
