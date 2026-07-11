import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

const POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
];

/**
 * Labelled filter trigger + connected menu (Shipments spec §3.2/§3.3).
 * Handles open/close, backdrop dismiss, Esc, and arrow-key roving over the
 * projected `[role="option"]` rows. The consumer renders the options and calls
 * `close()` on select.
 */
@Component({
  selector: 'app-filter-dropdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkOverlayOrigin, CdkConnectedOverlay, Icon],
  template: `
    <button
      #trigger
      type="button"
      class="fd__trigger"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      [class.is-open]="open()"
      [attr.aria-expanded]="open()"
      [attr.aria-haspopup]="'listbox'"
      [attr.aria-label]="ariaLabel()"
      (click)="toggle()"
    >
      <app-icon [name]="icon()" [size]="16" class="fd__lead" />
      <span class="fd__label">{{ label() }}</span>
      @if (count() !== null) {
        <span class="fd__count tabular">{{ count() }}</span>
      }
      <app-icon name="chevron-down" [size]="16" class="fd__caret" [class.is-open]="open()" />
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
      (backdropClick)="close()"
      (detach)="close()"
      (attach)="focusFirst()"
    >
      <div
        #menu
        class="fd__menu"
        role="listbox"
        [style.inline-size.px]="menuWidth()"
        (keydown)="onKeydown($event)"
      >
        <ng-content />
      </div>
    </ng-template>
  `,
  styleUrl: './filter-dropdown.scss',
})
export class FilterDropdown {
  readonly label = input.required<string>();
  readonly icon = input.required<IconName>();
  readonly count = input<number | null>(null);
  readonly ariaLabel = input<string>('Filter');
  readonly menuWidth = input(280);
  /** Emitted each time the menu opens — lets consumers reset internal view state. */
  readonly opened = output<void>();

  protected readonly positions = POSITIONS;
  protected readonly open = signal(false);

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) this.opened.emit();
  }

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }

  protected focusFirst(): void {
    requestAnimationFrame(() => {
      const options = this.optionEls();
      (options.find((o) => o.getAttribute('aria-selected') === 'true') ?? options[0])?.focus();
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const options = this.optionEls();
    if (!options.length) return;
    const current = options.indexOf(document.activeElement as HTMLElement);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const next = (current + delta + options.length) % options.length;
    options[next].focus();
  }

  private optionEls(): HTMLElement[] {
    const el = this.menu()?.nativeElement;
    return el ? Array.from(el.querySelectorAll<HTMLElement>('[role="option"]')) : [];
  }
}
