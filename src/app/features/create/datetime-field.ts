import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Icon } from '../../shared/ui';

interface DayCell { day: number; iso: string; today: boolean; sel: boolean; past: boolean; }

/**
 * Modern date-and-time picker. Trigger looks like a form field; opens a clean
 * calendar popover with month nav, a day grid, and quick time chips + a time
 * input. Emits a `YYYY-MM-DDTHH:mm` string (native datetime-local format).
 */
@Component({
  selector: 'app-datetime-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="dt">
      <button class="dt__trigger" type="button" [class.is-open]="open()" [class.is-set]="!!value()"
        [attr.aria-expanded]="open()" (click)="toggle()" (keydown.escape)="open.set(false)">
        <app-icon name="calendar" [size]="16" class="dt__ico" />
        <span class="dt__val">{{ display() || placeholder() }}</span>
        @if (value()) {
          <span class="dt__clear" role="button" tabindex="0" aria-label="Clear"
            (click)="clear($event)" (keydown.enter)="clear($event)"><app-icon name="x" [size]="14" /></span>
        }
      </button>

      @if (open()) {
        <div class="dt__backdrop" (click)="open.set(false)"></div>
        <div class="dt__pop" role="dialog">
          <div class="dt__head">
            <button class="dt__nav" type="button" aria-label="Previous month" (click)="shiftMonth(-1)"><app-icon name="chevron-left" [size]="18" /></button>
            <span class="dt__month">{{ monthLabel() }}</span>
            <button class="dt__nav" type="button" aria-label="Next month" (click)="shiftMonth(1)"><app-icon name="chevron-right" [size]="18" /></button>
          </div>

          <div class="dt__grid dt__grid--dow">
            @for (d of dow; track d) { <span class="dt__dow">{{ d }}</span> }
          </div>
          <div class="dt__grid">
            @for (c of cells(); track $index) {
              @if (c) {
                <button class="dt__day" type="button" [class.is-sel]="c.sel" [class.is-today]="c.today"
                  [disabled]="c.past" (click)="pickDay(c.iso)">{{ c.day }}</button>
              } @else { <span class="dt__day dt__day--pad"></span> }
            }
          </div>

          <div class="dt__time">
            <span class="dt__time-l"><app-icon name="clock" [size]="15" /> Time</span>
            <div class="dt__chips">
              @for (t of timeChips; track t.v) {
                <button class="dt__chip" type="button" [class.is-sel]="time() === t.v" (click)="pickTime(t.v)">{{ t.l }}</button>
              }
            </div>
            <input class="dt__timeinput" type="time" [value]="time()" (input)="pickTime($any($event.target).value)" aria-label="Custom time" />
          </div>

          <div class="dt__foot">
            <button class="dt__ghost" type="button" (click)="clear($event)">Clear</button>
            <button class="dt__ghost" type="button" (click)="pickToday()">Today</button>
            <button class="dt__done" type="button" (click)="open.set(false)">Done</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class DateTimeField {
  readonly value = input<string>('');
  readonly placeholder = input('Select date & time');
  readonly minToday = input(true);
  readonly changed = output<string>();

  protected readonly open = signal(false);
  protected readonly dow = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  protected readonly timeChips = [
    { l: '08:00', v: '08:00' }, { l: '10:00', v: '10:00' },
    { l: '12:00', v: '12:00' }, { l: '14:00', v: '14:00' }, { l: '17:00', v: '17:00' },
  ];

  // View month/year (defaults to selected date or today).
  private readonly view = signal(this.initialView());

  protected readonly time = computed(() => this.value().split('T')[1]?.slice(0, 5) || '09:00');

  private initialView(): { y: number; m: number } {
    const base = this.value() ? new Date(this.value()) : new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  }

  protected toggle(): void {
    if (!this.open()) this.view.set(this.initialView());
    this.open.update((v) => !v);
  }

  protected shiftMonth(delta: number): void {
    this.view.update(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  protected readonly monthLabel = computed(() => {
    const { y, m } = this.view();
    return new Date(y, m, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
  });

  protected readonly cells = computed<(DayCell | null)[]>(() => {
    const { y, m } = this.view();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const selDate = this.value() ? this.value().split('T')[0] : '';
    const out: (DayCell | null)[] = [];
    for (let i = 0; i < first; i++) out.push(null);
    for (let day = 1; day <= days; day++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(y, m, day);
      out.push({
        day, iso,
        today: date.getTime() === today.getTime(),
        sel: iso === selDate,
        past: this.minToday() && date.getTime() < today.getTime(),
      });
    }
    return out;
  });

  protected readonly display = computed(() => {
    if (!this.value()) return '';
    const d = new Date(this.value());
    const date = d.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' });
    return `${date} · ${this.time()}`;
  });

  protected pickDay(iso: string): void {
    this.changed.emit(`${iso}T${this.time()}`);
  }
  protected pickTime(t: string): void {
    const date = this.value() ? this.value().split('T')[0] : this.todayIso();
    this.changed.emit(`${date}T${t || '09:00'}`);
  }
  protected pickToday(): void {
    this.view.set({ y: new Date().getFullYear(), m: new Date().getMonth() });
    this.changed.emit(`${this.todayIso()}T${this.time()}`);
  }
  protected clear(e: Event): void {
    e.stopPropagation();
    this.changed.emit('');
  }
  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
