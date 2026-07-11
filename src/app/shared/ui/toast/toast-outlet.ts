import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/toast.service';
import { Icon } from '../icon/icon';

/** Renders active toasts. Mount once in the shell. */
@Component({
  selector: 'app-toast-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="true">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [attr.data-variant]="t.variant">
          @if (t.variant !== 'default') {
            <app-icon [name]="t.variant === 'success' ? 'check' : 'x'" [size]="16" />
          }
          <span>{{ t.text }}</span>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-outlet.scss',
})
export class ToastOutlet {
  protected readonly toast = inject(ToastService);
}
