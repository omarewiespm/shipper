import { Directive, ElementRef, inject, input, OnDestroy, OnInit } from '@angular/core';

const ROTATE_MS = 2600;
const FADE_MS = 220;

/**
 * Rotates the text of the host element through `rwWords`, fading out/in. Used
 * for the search hint's trailing word so a fixed prefix ("Search ") can stay
 * put while only the word changes. Pauses while `rwPaused` is true. Respects
 * prefers-reduced-motion (instant swap). Cleans up on destroy.
 */
@Directive({
  selector: '[appRotatingWord]',
  host: { class: 'rotating-word' },
})
export class RotatingWordDirective implements OnInit, OnDestroy {
  readonly words = input.required<string[]>({ alias: 'rwWords' });
  readonly paused = input(false, { alias: 'rwPaused' });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private index = 0;
  private timer?: ReturnType<typeof setInterval>;
  private fadeTimer?: ReturnType<typeof setTimeout>;

  private get reducedMotion(): boolean {
    return typeof matchMedia !== 'undefined'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  ngOnInit(): void {
    this.render();
    if (this.words().length > 1) {
      this.timer = setInterval(() => this.tick(), ROTATE_MS);
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    clearTimeout(this.fadeTimer);
  }

  private tick(): void {
    if (this.paused()) return;

    if (this.reducedMotion) {
      this.advance();
      return;
    }

    this.el.classList.add('is-fading');
    this.fadeTimer = setTimeout(() => {
      this.advance();
      this.el.classList.remove('is-fading');
    }, FADE_MS);
  }

  private advance(): void {
    this.index = (this.index + 1) % this.words().length;
    this.render();
  }

  private render(): void {
    this.el.textContent = this.words()[this.index];
  }
}
