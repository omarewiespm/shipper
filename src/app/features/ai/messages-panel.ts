import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, untracked, viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Avatar, Icon } from '../../shared/ui';
import { SidePanelService } from './side-panel.service';

type Party = 'fleet' | 'customer';
type Recipient = 'driver' | 'manager';
interface ChatMsg { me: boolean; text: string; time: string }

interface Chat {
  id: string;
  party: Party;
  shipmentId: string;
  route: string;
  name: string;        // counterparty (fleet company or customer)
  driver: string;      // fleet chats only
  last: string;
  time: string;
  unread: number;
  active: boolean;     // false once the shipment is delivered → history
}

/**
 * Messages center (drawer): search + Fleet/Customer tabs. Each chat is tied to a
 * shipment; active shipments are open to chat, delivered ones move to history
 * (read-only). Clicking a chat opens the conversation in place.
 */
@Component({
  selector: 'app-messages-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon, Avatar],
  templateUrl: './messages-panel.html',
  styleUrl: './messages-panel.scss',
})
export class MessagesPanel {
  protected readonly svc = inject(SidePanelService);
  private readonly router = inject(Router);

  protected readonly tab = signal<Party>('fleet');
  protected readonly tabLabel = computed(() => (this.tab() === 'customer' ? 'partner' : 'fleet'));
  protected readonly query = signal('');
  protected readonly openId = signal<string | null>(null);
  protected readonly recipient = signal<Recipient>('driver');
  protected readonly draft = signal('');
  protected readonly threads = signal<Record<string, ChatMsg[]>>({});

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  constructor() {
    // Reset to a clean state each time the drawer opens.
    effect(() => {
      if (this.svc.active() !== 'messages') return;
      untracked(() => { this.tab.set('fleet'); this.query.set(''); this.openId.set(null); });
    });
  }

  // --- Lists ---------------------------------------------------------------
  private readonly matches = computed<Chat[]>(() => {
    const q = this.query().trim().toLowerCase();
    return CHATS.filter((c) => c.party === this.tab())
      .filter((c) => !q || `${c.shipmentId} ${c.name} ${c.driver} ${c.route} ${c.last}`.toLowerCase().includes(q));
  });
  protected readonly activeChats = computed(() => this.matches().filter((c) => c.active));
  protected readonly pastChats = computed(() => this.matches().filter((c) => !c.active));

  protected readonly openChat = computed(() => CHATS.find((c) => c.id === this.openId()) ?? null);
  protected readonly messages = computed<ChatMsg[]>(() => this.threads()[this.currentKey()] ?? []);

  private currentKey(): string {
    const c = this.openChat();
    if (!c) return '';
    return c.party === 'fleet' ? `${c.id}:${this.recipient()}` : c.id;
  }

  // --- Navigation ----------------------------------------------------------
  protected select(party: Party): void { this.tab.set(party); }

  protected openConversation(c: Chat): void {
    this.openId.set(c.id);
    this.recipient.set('driver');
    this.ensureThread();
  }
  protected back(): void { this.openId.set(null); }

  protected setRecipient(r: Recipient): void {
    this.recipient.set(r);
    this.ensureThread();
  }

  private ensureThread(): void {
    const key = this.currentKey();
    const c = this.openChat();
    if (!c || this.threads()[key]) { this.scrollLater(); return; }
    let opener: string;
    if (c.party === 'fleet') {
      opener = this.recipient() === 'driver'
        ? `Hi — ${c.driver}, driving ${c.shipmentId} (${c.route}).`
        : `Hi — ${c.name} fleet desk, coordinating ${c.shipmentId}.`;
    } else {
      opener = `Hi — ${c.name}, receiver for ${c.shipmentId}.`;
    }
    if (!c.active) opener = `This chat closed when ${c.shipmentId} was delivered.`;
    this.threads.update((t) => ({ ...t, [key]: [{ me: false, text: opener, time: '' }] }));
    this.scrollLater();
  }

  // --- Send ----------------------------------------------------------------
  protected send(): void {
    const text = this.draft().trim();
    const c = this.openChat();
    if (!text || !c || !c.active) return;
    const key = this.currentKey();
    this.threads.update((t) => ({ ...t, [key]: [...(t[key] ?? []), { me: true, text, time: 'now' }] }));
    this.draft.set('');
    this.scrollLater();
    setTimeout(() => {
      this.threads.update((t) => ({ ...t, [key]: [...(t[key] ?? []), { me: false, text: this.reply(c), time: 'now' }] }));
      this.scrollLater();
    }, 700);
  }

  private reply(c: Chat): string {
    const pool = c.party === 'fleet'
      ? ['On schedule — no delays.', 'Driver just checked in, all good.', 'ETA still holds.', 'Sharing the live location now.']
      : ['Thanks, noted.', 'That works for us.', 'Please confirm the delivery window.', 'Received, we\'ll be ready.'];
    return pool[(this.threads()[this.currentKey()]?.length ?? 0) % pool.length];
  }

  protected openTracking(): void {
    const c = this.openChat();
    this.svc.close();
    this.router.navigateByUrl(c?.active ? '/tracking' : `/shipments/${c?.shipmentId}`);
  }

  private scrollLater(): void {
    queueMicrotask(() => {
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}

/* --- Mock chats: one fleet + one customer chat per shipment ---------------- */
const CHATS: Chat[] = [
  // Active (in-transit) shipments
  { id: 'SH-2042-f', party: 'fleet', shipmentId: 'SH-2042', route: 'Jeddah → Riyadh', name: 'Iron Clad Arabia', driver: 'Saeed Al Ghamdi', last: 'Driver is 20 min from pickup.', time: '5m', unread: 2, active: true },
  { id: 'SH-2042-c', party: 'customer', shipmentId: 'SH-2042', route: 'Jeddah → Riyadh', name: 'Al Othaim Markets', driver: '', last: 'Please confirm the delivery window.', time: '18m', unread: 1, active: true },
  { id: 'SH-2041-f', party: 'fleet', shipmentId: 'SH-2041', route: 'Dammam → Jeddah', name: 'Al Rajhi Transport', driver: 'Majed Al Dossari', last: 'Loaded and on the way.', time: '1h', unread: 0, active: true },
  { id: 'SH-2041-c', party: 'customer', shipmentId: 'SH-2041', route: 'Dammam → Jeddah', name: 'Gulf Cement Co.', driver: '', last: 'Can we adjust the drop-off time?', time: '2h', unread: 0, active: true },
  { id: 'SH-2039-f', party: 'fleet', shipmentId: 'SH-2039', route: 'Dammam → Riyadh', name: 'Modern Fleet Est.', driver: 'Turki Al Anazi', last: 'Almost there — entering Riyadh.', time: '3m', unread: 1, active: true },
  { id: 'SH-2039-c', party: 'customer', shipmentId: 'SH-2039', route: 'Dammam → Riyadh', name: 'NatPetro Supplies', driver: '', last: 'Great, we\'re ready to receive.', time: '40m', unread: 0, active: true },

  // Delivered shipments → history (read-only)
  { id: 'SH-2037-f', party: 'fleet', shipmentId: 'SH-2037', route: 'Jeddah → Riyadh', name: 'Al Rajhi Transport', driver: 'Saeed Al Ghamdi', last: 'Delivered, POD uploaded.', time: 'Mon', unread: 0, active: false },
  { id: 'SH-2037-c', party: 'customer', shipmentId: 'SH-2037', route: 'Jeddah → Riyadh', name: 'Panda Retail', driver: '', last: 'Received in full, thank you.', time: 'Mon', unread: 0, active: false },
  { id: 'SH-2035-f', party: 'fleet', shipmentId: 'SH-2035', route: 'Riyadh → Dammam', name: 'Modern Fleet Est.', driver: 'Khalid Al Otaibi', last: 'Offloaded at the warehouse.', time: 'Jun 28', unread: 0, active: false },
  { id: 'SH-2035-c', party: 'customer', shipmentId: 'SH-2035', route: 'Riyadh → Dammam', name: 'BinDawood Stores', driver: '', last: 'All good on our side.', time: 'Jun 28', unread: 0, active: false },
];
