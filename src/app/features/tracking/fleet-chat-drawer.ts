import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { Avatar, Icon } from '../../shared/ui';
import { LiveShipment } from './tracking.store';

interface Msg { me: boolean; text: string; }
type Recipient = 'driver' | 'fleet';

/** Chat drawer for a live shipment — talk to the driver or the fleet manager. */
@Component({
  selector: 'app-fleet-chat-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon, Avatar],
  template: `
    @if (shipment(); as s) {
      <div class="sd-scrim" (click)="closed.emit()"></div>
      <aside class="sd fc" role="dialog" aria-modal="true" [attr.aria-label]="'Chat about ' + s.id"
        cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (keydown.escape)="closed.emit()">
        <header class="sd__head">
          <app-avatar [name]="name()" [size]="38" tone="neutral" [square]="true" />
          <div class="fc__id">
            <span class="fc__name">{{ name() }}</span>
            <span class="fc__presence"><span class="fc__dot"></span> {{ sub() }} · online</span>
          </div>
          <button class="sd__close" type="button" aria-label="Close" (click)="closed.emit()"><app-icon name="x" [size]="18" /></button>
        </header>

        <!-- Recipient toggle -->
        <div class="fc__seg" role="tablist">
          <button class="fc__segbtn" type="button" role="tab" [class.is-on]="to() === 'driver'"
            [attr.aria-selected]="to() === 'driver'" (click)="to.set('driver')">
            <app-icon name="truck" [size]="14" /> Driver
          </button>
          <button class="fc__segbtn" type="button" role="tab" [class.is-on]="to() === 'fleet'"
            [attr.aria-selected]="to() === 'fleet'" (click)="to.set('fleet')">
            <app-icon name="building" [size]="14" /> Fleet manager
          </button>
        </div>

        <div class="sd__body fc__body">
          @for (msg of messages(); track $index) {
            <div class="fc__msg" [class.fc__msg--me]="msg.me"><span class="fc__bubble">{{ msg.text }}</span></div>
          }
        </div>

        <div class="fc__quick">
          @for (q of quick; track q) {
            <button class="fc__chip" type="button" (click)="send(q)">{{ q }}</button>
          }
        </div>

        <div class="fc__composer">
          <input class="fc__input" [value]="draft()" (input)="draft.set($any($event.target).value)"
            (keydown.enter)="send(draft())" [placeholder]="'Message the ' + (to() === 'driver' ? 'driver' : 'fleet manager') + '…'" aria-label="Message" />
          <button class="fc__send" type="button" aria-label="Send" (click)="send(draft())"><app-icon name="send" [size]="18" /></button>
        </div>
      </aside>
    }
  `,
  styleUrl: './fleet-chat-drawer.scss',
})
export class FleetChatDrawer {
  readonly shipment = input<LiveShipment | null>(null);
  readonly closed = output<void>();

  protected readonly to = signal<Recipient>('driver');
  protected readonly draft = signal('');
  protected readonly messages = signal<Msg[]>([]);
  protected readonly quick = ['Where are you now?', 'Any delays?', 'Confirm ETA', 'Share live location'];

  protected readonly name = computed(() => {
    const s = this.shipment();
    if (!s) return '';
    return this.to() === 'driver' ? s.driver.name : s.fleet.name;
  });
  protected readonly sub = computed(() => {
    const s = this.shipment();
    if (!s) return '';
    return this.to() === 'driver' ? s.driver.truck : s.fleet.company;
  });

  constructor() {
    // Fresh thread whenever the shipment or the recipient changes.
    effect(() => {
      const s = this.shipment();
      const who = this.to();
      if (!s) return;
      const opener = who === 'driver'
        ? `Hi — ${s.driver.name} here, driving ${s.id}. I'm on the ${s.originCity}–${s.destCity} run.`
        : `Hi — ${s.fleet.name} fleet desk. I'm coordinating ${s.id} for you.`;
      untracked(() => this.messages.set([{ me: false, text: opener }]));
    });
  }

  protected send(text: string): void {
    const t = text.trim();
    if (!t) return;
    this.messages.update((m) => [...m, { me: true, text: t }]);
    this.draft.set('');
    setTimeout(() => this.messages.update((m) => [...m, { me: false, text: this.reply() }]), 700);
  }

  private reply(): string {
    const pool = this.to() === 'driver'
      ? ['Just passed the last checkpoint — all good.', 'On schedule, no delays.', 'ETA still holds, I\'ll call before arrival.', 'Sending my live location now.']
      : ['Driver checked in — everything on track.', 'No delays flagged on this lane.', 'ETA confirmed. You\'ll get an arrival alert.', 'Sharing the live location with you.'];
    return pool[this.messages().length % pool.length];
  }
}
