import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Partner, PartnerRelationship } from '../../core/data/partners.api';
import { Avatar, Button, FilterDropdown, Icon, StatusChip } from '../../shared/ui';
import { downloadCsv } from '../shipments/csv';
import { AddPartnerDrawer, NewPartner } from './add-partner-drawer';
import { PartnerActionsMenu } from './partner-actions-menu';
import { PartnersStore, RelFilter } from './partners.store';

type Tab = 'directory' | 'po';
const PAGE_SIZE = 8;

/** Partners — companies you trade with (customers & suppliers). Directory tab. */
@Component({
  selector: 'app-partners',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Avatar, StatusChip, Button, FilterDropdown, PartnerActionsMenu, AddPartnerDrawer],
  templateUrl: './partners.html',
  styleUrl: './partners.scss',
})
export class Partners implements OnInit {
  protected readonly store = inject(PartnersStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Bound from the route data via withComponentInputBinding(). */
  readonly tab = input<Tab>('directory');
  protected readonly addOpen = signal(false);

  protected readonly relFilters: { key: RelFilter; label: string }[] = [
    { key: 'all', label: 'All partners' },
    { key: 'customer', label: 'Customers' },
    { key: 'supplier', label: 'Suppliers' },
  ];
  protected readonly relLabel = computed(() =>
    this.relFilters.find((f) => f.key === this.store.rel())?.label ?? 'All partners',
  );
  protected relCount(key: RelFilter): number {
    const c = this.store.counts();
    return key === 'customer' ? c.customers : key === 'supplier' ? c.suppliers : c.total;
  }

  // --- Pagination for the On-Madar table -----------------------------------
  protected readonly page = signal(1);
  protected readonly total = computed(() => this.store.directory().length);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.pageCount() }, (_, i) => i + 1));
  protected readonly pagedOnMadar = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.store.directory().slice(start, start + PAGE_SIZE);
  });
  protected readonly showingFrom = computed(() => (this.total() ? (this.page() - 1) * PAGE_SIZE + 1 : 0));
  protected readonly showingTo = computed(() => Math.min(this.page() * PAGE_SIZE, this.total()));

  constructor() {
    // Reset to the first page whenever the search or filter changes.
    effect(() => { this.store.query(); this.store.rel(); untracked(() => this.page.set(1)); });
  }

  ngOnInit(): void { this.store.load(); }

  protected selectRel(key: RelFilter, dropdown: FilterDropdown): void {
    this.store.rel.set(key);
    dropdown.close();
  }
  protected goToPage(n: number): void {
    if (n >= 1 && n <= this.pageCount()) this.page.set(n);
  }

  protected relTag(rel: PartnerRelationship): { label: string; tone: string } {
    switch (rel) {
      case 'customer': return { label: 'Customer', tone: 'navy' };
      case 'supplier': return { label: 'Supplier', tone: 'gold' };
      case 'both': return { label: 'Customer & supplier', tone: 'sky' };
    }
  }

  protected madarChip(p: Partner): { label: string; tone: 'ok' | 'warn' | 'neutral' } {
    switch (p.madarStatus) {
      case 'active': return { label: 'On Madar', tone: 'ok' };
      case 'invited': return { label: 'Invited', tone: 'warn' };
      default: return { label: 'Not invited', tone: 'neutral' };
    }
  }

  protected invite(p: Partner): void {
    this.store.invite(p.id);
    this.toast.show(`Invite sent to ${p.name}`, 'success');
  }
  protected view(p: Partner): void {
    this.router.navigateByUrl(`/partners/directory/${p.id}`);
  }
  protected onSaved(payload: NewPartner): void {
    this.store.add(payload);
    this.addOpen.set(false);
    this.toast.show(`${payload.name} added${payload.invite ? ' & invited' : ''}`, 'success');
  }
  protected onBulkSaved(rows: NewPartner[]): void {
    rows.forEach((r) => this.store.add(r));
    this.toast.show(`${rows.length} partners imported & invited`, 'success');
  }

  protected exportCsv(): void {
    const rows = this.store.directory();
    if (!rows.length) { this.toast.show('Nothing to export', 'error'); return; }
    const headers = ['Partner', 'Relationship', 'Madar status', 'City', 'Contact', 'Phone', 'Email', 'Shipments', 'On-time %', 'Open POs'];
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = [headers.join(',')];
    for (const p of rows) {
      lines.push([p.name, p.relationship, p.madarStatus, p.city, p.contactName, p.contactPhone, p.contactEmail, p.shipments, `${p.onTimePct}%`, p.openPos]
        .map((v) => esc(String(v))).join(','));
    }
    downloadCsv(`madar-partners-${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\r\n'));
    this.toast.show(`Exported ${rows.length} partners`, 'success');
  }
}
