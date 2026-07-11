import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChildren } from '@angular/core';

/** Six single-character OTP boxes (spec §4). LTR even in RTL. */
@Component({
  selector: 'app-otp-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="a-otp" [class.a-otp--error]="error()" role="group" aria-label="One-time code">
      @for (i of slots; track i) {
        <input
          #box
          class="a-otp__box"
          [class.a-otp__box--filled]="!!digits()[i]"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="1"
          [attr.aria-label]="'Digit ' + (i + 1) + ' of 6'"
          [value]="digits()[i]"
          (input)="onInput($event, i)"
          (keydown)="onKeydown($event, i)"
          (paste)="onPaste($event)"
          (focus)="select($event)"
        />
      }
    </div>
  `,
})
export class OtpInput {
  readonly error = input(false);
  readonly completed = output<string>();

  protected readonly slots = [0, 1, 2, 3, 4, 5];
  protected readonly digits = signal<string[]>(['', '', '', '', '', '']);
  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');

  clear(): void {
    this.digits.set(['', '', '', '', '', '']);
    this.focus(0);
  }
  focusFirst(): void {
    this.focus(0);
  }

  protected select(e: Event): void {
    (e.target as HTMLInputElement).select();
  }

  protected onInput(e: Event, i: number): void {
    const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '');
    const next = [...this.digits()];
    next[i] = raw.slice(-1) ?? '';
    this.digits.set(next);
    if (next[i] && i < 5) this.focus(i + 1);
    this.emitIfComplete();
  }

  protected onKeydown(e: KeyboardEvent, i: number): void {
    if (e.key === 'Backspace' && !this.digits()[i] && i > 0) {
      e.preventDefault();
      const next = [...this.digits()];
      next[i - 1] = '';
      this.digits.set(next);
      this.focus(i - 1);
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      this.focus(i - 1);
    } else if (e.key === 'ArrowRight' && i < 5) {
      e.preventDefault();
      this.focus(i + 1);
    }
  }

  protected onPaste(e: ClipboardEvent): void {
    const text = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    this.digits.set(next);
    this.focus(Math.min(text.length, 5));
    this.emitIfComplete();
  }

  private emitIfComplete(): void {
    const code = this.digits().join('');
    if (code.length === 6 && !this.digits().includes('')) this.completed.emit(code);
  }

  private focus(i: number): void {
    queueMicrotask(() => this.boxes()[i]?.nativeElement.focus());
  }
}
