import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Avatar, Icon, StatusChip } from '../../shared/ui';
import { SidePanelService } from '../ai/side-panel.service';
import { PartnersStore } from './partners.store';

type Tab = 'details' | 'locations' | 'orders' | 'documents';
type StepState = 'done' | 'active' | 'current' | 'todo';
interface DealStep { label: string; sub: string; state: StepState }
interface Deal { id: string; date: string; amount: number; shipmentId?: string; steps: DealStep[] }
interface OrderGroup { key: 'selling' | 'buying'; title: string; sub: string; deals: Deal[] }

const NAMES = ['Abdullah Al Harbi', 'Mohammed Al Otaibi', 'Khalid Al Dosari', 'Fahad Al Shehri', 'Sultan Al Ghamdi', 'Nawaf Al Anazi', 'Yousef Al Amoudi', 'Bandar Al Qahtani'];
const CITIES = ['Riyadh', 'Jeddah', 'Dammam', 'Makkah', 'Madinah', 'Buraydah'];
const DATES = ['02 Jun 2026', '11 Jun 2026', '19 Jun 2026', '26 Jun 2026', '03 Jul 2026', '09 Jul 2026'];

/** Deal lifecycle snapshots (PO issued → SO confirmed → shipment). */
const STAGES = [
  { so: true, ship: 'in_transit' },
  { so: true, ship: 'awaiting' },
  { so: false, ship: 'none' },
  { so: true, ship: 'delivered' },
  { so: true, ship: 'none' },
] as const;
const SHIP_LABEL: Record<string, string> = {
  none: 'Not shipped', awaiting: 'Awaiting pickup', in_transit: 'In transit', delivered: 'Delivered',
};

/** Full-page partner detail — tabbed (details / locations / POs / documents). */
@Component({
  selector: 'app-partner-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Avatar, StatusChip],
  templateUrl: './partner.html',
  styleUrl: './partner.scss',
})
export class PartnerDetail implements OnInit {
  readonly id = input.required<string>();

  protected readonly store = inject(PartnersStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly panel = inject(SidePanelService);

  protected readonly tab = signal<Tab>('details');
  protected readonly tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Details' },
    { key: 'locations', label: 'Locations' },
    { key: 'orders', label: 'Orders' },
    { key: 'documents', label: 'Documents' },
  ];

  protected readonly partner = computed(() => this.store.byId(this.id()) ?? null);

  protected readonly rel = computed<{ label: string; tone: string }>(() => {
    switch (this.partner()?.relationship) {
      case 'supplier': return { label: 'Supplier', tone: 'gold' };
      case 'both': return { label: 'Customer & supplier', tone: 'sky' };
      default: return { label: 'Customer', tone: 'navy' };
    }
  });
  protected readonly chip = computed(() => {
    switch (this.partner()?.madarStatus) {
      case 'active': return { label: 'On Madar', tone: 'ok' as const };
      case 'invited': return { label: 'Invited', tone: 'warn' as const };
      default: return { label: 'Not invited', tone: 'neutral' as const };
    }
  });

  // --- Derived tab content (mock, deterministic per partner) ----------------
  protected readonly locations = computed(() => {
    const p = this.partner();
    if (!p) return [];
    const h = this.hash(p.id);
    const second = CITIES[(h >> 2) % CITIES.length] === p.city ? CITIES[(h >> 4) % CITIES.length] : CITIES[(h >> 2) % CITIES.length];
    return [
      { name: `${p.name} — HQ Warehouse`, city: p.city, address: `${p.city} Industrial City, Gate 3`, contact: p.contactName, phone: p.contactPhone, primary: true },
      { name: `${p.name} — ${second} DC`, city: second, address: `${second} Logistics Park, Bay 12`, ...this.person(p.id + 'l'), primary: false },
    ];
  });

  // Customer → we sell to them; Supplier → we buy from them; Both → both areas.
  protected readonly hasSelling = computed(() => ['customer', 'both'].includes(this.partner()?.relationship ?? ''));
  protected readonly hasBuying = computed(() => ['supplier', 'both'].includes(this.partner()?.relationship ?? ''));

  protected readonly orderGroups = computed<OrderGroup[]>(() => {
    const p = this.partner();
    if (!p) return [];
    const groups: OrderGroup[] = [];
    if (this.hasSelling()) {
      groups.push({ key: 'selling', title: 'Sales Orders', sub: `Orders you fulfil for ${p.name} — you ship out to them.`, deals: this.makeDeals('selling', p.id + 'sell') });
    }
    if (this.hasBuying()) {
      groups.push({ key: 'buying', title: 'Purchase Orders', sub: `Orders you place with ${p.name} — they deliver to you.`, deals: this.makeDeals('buying', p.id + 'buy') });
    }
    return groups;
  });

  private makeDeals(kind: 'selling' | 'buying', seed: string): Deal[] {
    const h = this.hash(seed);
    const base = kind === 'selling' ? 5000 : 4000;
    return Array.from({ length: 3 }, (_, i) => {
      const st = STAGES[(h + i) % STAGES.length];
      const shipState: StepState = !st.so ? 'todo'
        : st.ship === 'none' ? 'current'
          : st.ship === 'delivered' ? 'done' : 'active';
      return {
        id: `ORD-${base + (h % 900) + i}`,
        date: DATES[(h + i) % DATES.length],
        amount: (((h >> (i + 1)) % 40) + 8) * 1000,
        shipmentId: st.ship === 'none' ? undefined : `SH-20${30 + ((h + i) % 40)}`,
        steps: [
          { label: 'PO', sub: 'Issued', state: 'done' },
          { label: 'SO', sub: st.so ? 'Confirmed' : 'Awaiting', state: st.so ? 'done' : 'current' },
          { label: 'Shipment', sub: SHIP_LABEL[st.ship], state: shipState },
        ],
      };
    });
  }

  protected readonly documents = computed(() => {
    const p = this.partner();
    if (!p) return [];
    const h = this.hash(p.id);
    const kinds: { type: string; icon: 'file-check' | 'shield' | 'receipt' }[] = [
      { type: 'Waybill', icon: 'file-check' },
      { type: 'Delivery note', icon: 'file-check' },
      { type: 'Bayan (trip manifest)', icon: 'shield' },
      { type: 'Invoice', icon: 'receipt' },
    ];
    const n = Math.min(6, Math.max(3, p.shipments % 6 || 4));
    return Array.from({ length: n }, (_, i) => {
      const k = kinds[i % kinds.length];
      return { type: k.type, icon: k.icon, ref: `SH-20${30 + ((h + i) % 40)}`, date: DATES[(h + i * 2) % DATES.length] };
    });
  });

  private person(seed: string): { contact: string; phone: string } {
    const h = this.hash(seed);
    const d = (h >> 3) % 9 + 1;
    return { contact: NAMES[h % NAMES.length], phone: `+966 5${d} ${(h >> 6) % 900 + 100} ${(h >> 9) % 9000 + 1000}` };
  }
  private hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  protected fmt(n: number): string { return n.toLocaleString('en-US'); }

  ngOnInit(): void { this.store.load(); }

  protected back(): void { this.router.navigateByUrl('/partners/directory'); }
  protected invite(): void {
    const p = this.partner();
    if (!p) return;
    this.store.invite(p.id);
    this.toast.show(`Invite sent to ${p.name}`, 'success');
  }
  protected message(): void { this.panel.open('messages'); }
  protected goShipments(): void { this.router.navigateByUrl('/shipments'); }
}
