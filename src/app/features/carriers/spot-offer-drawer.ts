import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Avatar, Icon } from '../../shared/ui';
import { AvailableTruck } from './carriers.store';

interface Msg { me: boolean; text: string; }

/** Spot-pickup negotiation: see the truck, offer a price, chat, accept → book. */
@Component({
  selector: 'app-spot-offer-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon, Avatar],
  templateUrl: './spot-offer-drawer.html',
  styleUrl: './spot-offer-drawer.scss',
})
export class SpotOfferDrawer {
  readonly truck = input<AvailableTruck | null>(null);
  readonly closed = output<void>();

  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly price = signal(0);
  protected readonly messages = signal<Msg[]>([]);
  protected readonly agreed = signal(false);
  protected readonly draft = signal('');
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  constructor() {
    effect(() => {
      const t = this.truck();
      if (!t) return;
      untracked(() => {
        this.price.set(t.suggestedPrice);
        this.agreed.set(false);
        this.messages.set([{ me: false, text: `Hi — ${t.fleet} here. My ${t.truckType} (${t.capacityT}t) is in ${t.atCity} heading to ${t.headingCity}. Make me an offer for your load.` }]);
      });
    });
  }

  protected step(delta: number): void { this.price.update((p) => Math.max(0, p + delta)); }
  protected setPrice(v: string): void { const n = +v; if (Number.isFinite(n)) this.price.set(Math.max(0, Math.round(n))); }

  protected sendOffer(): void {
    const t = this.truck();
    if (!t) return;
    const offer = this.price();
    this.push(true, `I can offer SAR ${offer.toLocaleString()} for this pickup.`);
    setTimeout(() => {
      if (offer >= Math.round(t.suggestedPrice * 0.92)) {
        this.agreed.set(true);
        this.push(false, `Deal — SAR ${offer.toLocaleString()} works. Accept and I'll assign a driver.`);
      } else {
        const counter = Math.round((offer + t.suggestedPrice) / 2 / 50) * 50;
        this.push(false, `That's a little low for this lane. Can you do SAR ${counter.toLocaleString()}?`);
      }
    }, 700);
  }

  protected sendMessage(): void {
    const text = this.draft().trim();
    if (!text) return;
    this.push(true, text);
    this.draft.set('');
    setTimeout(() => this.push(false, this.reply(text)), 700);
  }
  private reply(text: string): string {
    const l = text.toLowerCase();
    if (l.includes('when') || l.includes('time') || l.includes('now')) return 'I can be at your pickup within the hour once we agree a price.';
    if (l.includes('price') || l.includes('discount') || l.includes('cheap') || l.includes('lower')) return 'Send me your number and I\'ll see what I can do.';
    if (l.includes('capacity') || l.includes('weight') || l.includes('load')) return `The truck takes up to ${this.truck()?.capacityT}t — should be fine for your load.`;
    const pool = ['Sure, that works for me.', 'Understood — send your offer whenever you\'re ready.', 'The truck is loaded and ready to move.', 'Happy to run this lane for you.'];
    return pool[this.messages().length % pool.length];
  }

  protected accept(): void {
    const t = this.truck();
    if (!t) return;
    this.toast.show(`Booked ${t.fleet} at SAR ${this.price().toLocaleString()} — shipment assigned`, 'success');
    this.closed.emit();
    this.router.navigate(['/shipments', 'SH-2042']);
  }

  private push(me: boolean, text: string): void {
    this.messages.update((m) => [...m, { me, text }]);
    queueMicrotask(() => { const el = this.scroller()?.nativeElement; if (el) el.scrollTop = el.scrollHeight; });
  }
}
