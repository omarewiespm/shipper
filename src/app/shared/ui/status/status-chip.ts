import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tone } from './status.presenter';

/**
 * Status chip (UI spec §3.3). Pill, tinted bg + matching text, leading dot.
 * Live tones (info/warn) may pulse. Status is never colour-only — the label
 * always carries the meaning too.
 */
@Component({
  selector: 'app-status-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip" [attr.data-tone]="tone()">
      <span class="chip__dot" [class.chip__dot--pulse]="pulse()"></span>
      {{ label() }}
    </span>
  `,
  styleUrl: './status-chip.scss',
})
export class StatusChip {
  readonly label = input.required<string>();
  readonly tone = input<Tone>('neutral');
  readonly pulse = input(false);
}
