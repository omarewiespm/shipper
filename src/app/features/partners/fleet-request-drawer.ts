import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, effect, input, output, signal, untracked } from '@angular/core';
import { Avatar, Icon } from '../../shared/ui';
import { AvailableTruck } from '../carriers/carriers.store';

interface Msg { me: boolean; text: string; }

/**
 * Chat with a fleet manager after picking a truck in Find Truck — negotiate,
 * ask questions, and create the shipment directly from the conversation.
 */
@Component({
  selector: 'app-fleet-request-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon, Avatar],
  template: `
    @if (truck(); as t) {
      <div class="sd-scrim" (click)="closed.emit()"></div>
      <aside class="sd fcr" role="dialog" aria-modal="true" [attr.aria-label]="'Chat with ' + t.fleet"
        cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (keydown.escape)="closed.emit()">
        <header class="sd__head">
          <app-avatar [name]="t.fleet" [size]="38" tone="neutral" [square]="true" />
          <div class="fcr__id">
            <span class="fcr__name">{{ t.fleet }}</span>
            <span class="fcr__presence"><span class="fcr__dot"></span> Fleet manager · online</span>
          </div>
          <button class="sd__close" type="button" aria-label="Close" (click)="closed.emit()"><app-icon name="x" [size]="18" /></button>
        </header>

        <!-- Truck + ETA context -->
        <div class="fcr__ctx">
          <span class="fcr__ctx-item"><app-icon name="truck" [size]="14" /> {{ t.truckType }} · {{ t.capacityT }}t</span>
          <span class="fcr__ctx-item"><app-icon name="clock" [size]="14" /> Arrives {{ eta() }}</span>
        </div>

        <div class="sd__body fcr__body">
          @for (m of messages(); track $index) {
            <div class="fcr__msg" [class.fcr__msg--me]="m.me"><span class="fcr__bubble">{{ m.text }}</span></div>
          }
        </div>

        <div class="fcr__quick">
          @for (q of quick; track q) { <button class="fcr__chip" type="button" (click)="send(q)">{{ q }}</button> }
        </div>

        <div class="fcr__composer">
          <input class="fcr__input" [value]="draft()" (input)="draft.set($any($event.target).value)"
            (keydown.enter)="send(draft())" placeholder="Message the fleet manager…" aria-label="Message" />
          <button class="fcr__send" type="button" aria-label="Send" (click)="send(draft())"><app-icon name="send" [size]="18" /></button>
        </div>

        <div class="fcr__foot">
          <button class="fcr__cta" type="button" (click)="createShipment.emit(t)"><app-icon name="package" [size]="16" /> Create shipment</button>
        </div>
      </aside>
    }
  `,
  styleUrl: './fleet-request-drawer.scss',
})
export class FleetRequestDrawer {
  readonly truck = input<AvailableTruck | null>(null);
  readonly eta = input<string>('');
  readonly closed = output<void>();
  readonly createShipment = output<AvailableTruck>();

  protected readonly draft = signal('');
  protected readonly messages = signal<Msg[]>([]);
  protected readonly quick = ['What’s your best price?', 'Can you pick up today?', 'Confirm truck capacity', 'Share documents'];

  constructor() {
    // Fresh thread whenever the truck changes.
    effect(() => {
      const t = this.truck();
      if (!t) return;
      const opener = `Hi — ${t.fleet} fleet desk here. Our ${t.truckType} (${t.capacityT}t) is ${t.distanceKm} km from your warehouse and ready to take this load. How can I help?`;
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
    const pool = [
      'We can do that — sending you our best rate now.',
      'Yes, the truck is ready and can pick up on your schedule.',
      'Capacity confirmed for this load.',
      'Great — let’s create the shipment and we’ll roll out.',
    ];
    return pool[this.messages().length % pool.length];
  }
}
