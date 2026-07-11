import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS, IconName } from './icons';

/**
 * Thin wrapper over Lucide so the app references stable names (`dashboard`,
 * `wallet`, …) instead of glyph imports. Inherits text color; direction-implying
 * icons (chevron/arrow) flip in RTL.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <lucide-angular
      [img]="glyph()"
      [size]="size()"
      [strokeWidth]="stroke()"
      [class.flip-rtl]="flips()"
    />
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        line-height: 0;
      }
      :host-context([dir='rtl']) .flip-rtl {
        transform: scaleX(-1);
      }
    `,
  ],
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(18);
  readonly stroke = input(1.75);

  protected readonly glyph = computed(() => ICONS[this.name()]);
  protected readonly flips = computed(() =>
    ['chevron-right', 'arrow-right', 'chevron-left', 'arrow-left'].includes(this.name()),
  );
}
