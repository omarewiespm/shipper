import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Small dark tooltip bubble, positioned by TooltipDirective via CDK overlay. */
@Component({
  selector: 'app-tooltip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ text }}`,
  host: { role: 'tooltip' },
  styles: [
    `
      :host {
        display: block;
        max-inline-size: 220px;
        padding: 4px 8px;
        border-radius: 6px;
        background: rgba(34, 50, 103, 0.92);
        color: #fff;
        font-family: var(--font);
        font-size: 11.5px;
        font-weight: 500;
        line-height: 1.3;
        letter-spacing: 0.1px;
        box-shadow: var(--shadow-lift);
        backdrop-filter: blur(2px);
        pointer-events: none;
        white-space: nowrap;
      }
    `,
  ],
})
export class Tooltip {
  text = '';
}
