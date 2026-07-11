import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, output, signal, untracked, viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService } from '../../core/analytics.service';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui';
import { CreateShipmentStore } from './create.store';

interface Msg { id: number; from: 'ai' | 'user'; text: string }

const KNOWN_CITIES = ['riyadh', 'jeddah', 'dammam', 'makkah', 'madinah', 'buraydah', 'al kharj', 'khobar'];
const GREETING = "Hi — I'm Madar AI. Describe the shipment you want and I'll set it up. For example: “Send a reefer from Riyadh to Al Othaim Markets in Jeddah.”";

/** Create with Madar AI — the conversational agent as a right-side drawer (mock). */
@Component({
  selector: 'app-create-ai-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon],
  templateUrl: './create-ai-drawer.html',
  styleUrl: './create-ai-drawer.scss',
})
export class CreateAiDrawer {
  readonly open = input(false);
  readonly seed = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly store = inject(CreateShipmentStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly analytics = inject(AnalyticsService);

  protected readonly messages = signal<Msg[]>([]);
  protected readonly draft = signal('');
  protected readonly thinking = signal(false);
  protected readonly submitting = signal(false);
  protected readonly reviewing = signal(false);
  private seq = 0;

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  // --- Compact summary labels (shown only when ready to create) -------------
  protected readonly priceChip = computed(() => {
    const p = this.store.priceState();
    if (p.model === 'fixed') return `SAR ${p.total!.toLocaleString()}`;
    if (p.model === 'bidding') return 'Bidding';
    return '';
  });
  protected readonly routeLabel = computed(() =>
    `${this.store.pickup()?.city ?? '—'} → ${this.store.destinationCity() ?? '—'}`,
  );
  protected readonly vehicleLabel = computed(() => this.store.vehicleTypes().join(', ') || '—');
  protected readonly creatingLabel = computed(() => {
    const n = this.store.numberOfShipments();
    return n === 1 ? '1 shipment' : `${n} shipments`;
  });
  protected readonly primaryLabel = computed(() =>
    this.store.priceState().model === 'bidding' ? 'Post for bidding' : `Create ${this.creatingLabel()}`,
  );

  constructor() {
    // Start a fresh conversation each time the drawer opens.
    effect(() => {
      if (!this.open()) return;
      untracked(() => this.start());
    });

    // AI flow assumes your default warehouse as pickup unless told otherwise.
    effect(() => {
      const locs = this.store.pickupLocations();
      if (!this.open() || !locs.length) return;
      untracked(() => {
        if (!this.store.pickup()) this.store.pickup.set(locs.find((l) => l.primary) ?? locs[0]);
      });
    });
  }

  private start(): void {
    this.store.load();
    this.seq = 0;
    this.reviewing.set(false);
    this.messages.set([]);
    this.push('ai', GREETING);
    const q = this.seed();
    if (q) setTimeout(() => this.handle(q), 300);
  }

  protected send(): void {
    const text = this.draft().trim();
    if (!text || this.thinking()) return;
    this.draft.set('');
    this.handle(text);
  }

  protected voice(): void {
    this.toast.show('Voice input coming soon');
  }

  protected create(): void {
    if (!this.store.canSubmit()) return;
    this.submitting.set(true);
    const model = this.store.priceState().model;
    this.analytics.track('create_submitted', { model, via: 'ai', numberOfShipments: this.store.numberOfShipments(), stops: this.store.stops().length, vehicleTypes: this.store.vehicleTypes().length });
    setTimeout(() => {
      this.submitting.set(false);
      this.closed.emit();
      if (model === 'bidding') { this.toast.show('Posted for bidding'); this.router.navigate(['/shipments', 'SH-2042']); }
      else { this.toast.show('Shipment created', 'success'); this.router.navigate(['/shipments']); }
    }, 600);
  }
  protected saveDraft(): void {
    this.toast.show('Saved as draft');
    this.closed.emit();
    this.router.navigate(['/shipments']);
  }

  // --- Mock agent ----------------------------------------------------------
  private handle(text: string): void {
    this.push('user', text);
    this.thinking.set(true);
    setTimeout(() => {
      const reply = this.process(text);
      this.thinking.set(false);
      this.push('ai', reply);
    }, 650);
  }

  private process(text: string): string {
    const lower = ` ${text.toLowerCase()} `;
    const captured: string[] = [];

    for (const v of this.store.allVehicleTypes()) {
      const token = v.toLowerCase().split(/[ -]/)[0];
      if (lower.includes(token) && !this.store.vehicleTypes().includes(v)) {
        this.store.toggleVehicle(v);
        captured.push(v);
      }
    }

    if (!this.store.stops()[0]?.location) {
      const cust = this.store.customers().find((c) => lower.includes(c.name.toLowerCase()) || lower.includes(c.city.toLowerCase()));
      if (cust) { this.store.setStopLocation(0, cust); captured.push(`${cust.name} (${cust.city})`); }
      else {
        const city = KNOWN_CITIES.find((c) => lower.includes(c));
        if (city) {
          const name = city.replace(/\b\w/g, (m) => m.toUpperCase());
          this.store.setStopLocation(0, { id: 'new', name, address: name, city: name }, true);
          captured.push(name);
        }
      }
    }

    if (!this.store.productType()) {
      const p = this.store.products().find((pr) => lower.includes(pr.toLowerCase().split(/[ &]/)[0]));
      if (p) { this.store.productType.set(p); captured.push(p); }
    }

    return this.respond(captured);
  }

  private respond(captured: string[]): string {
    const lead = captured.length ? `Got it — ${captured.join(', ')}. ` : '';
    if (!this.store.stops()[0]?.location) return `${lead}Where's it going? Name a customer or a city.`.trim();
    if (!this.store.vehicleTypes().length) return `${lead}Which vehicle — Reefer Trailer, Curtain-side, Flatbed, or Box 12m?`.trim();

    const p = this.store.priceState();
    const to = this.store.destinationCity();
    if (p.model === 'fixed') {
      return `${lead}Your contract price is SAR ${p.total!.toLocaleString()}, picking up from ${this.store.pickup()?.name}. Review the summary below and create it — or tell me what to change.`.trim();
    }
    return `${lead}There's no contract rate for ${this.store.pickup()?.city} → ${to} with ${p.vehicle}, so we'll post it for bidding and carriers will quote. Post it below — or adjust.`.trim();
  }

  private push(from: 'ai' | 'user', text: string): void {
    this.messages.update((m) => [...m, { id: ++this.seq, from, text }]);
    queueMicrotask(() => {
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
