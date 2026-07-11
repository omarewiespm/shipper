import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Shipment } from '../../models';
import {
  Button,
  EmptyState,
  FilterDropdown,
  Icon,
  Skeleton,
  StatusChip,
  SHIPMENT_STATUS_FILTERS,
  shipmentChipView,
} from '../../shared/ui';
import { CreateDrawerService } from '../create/create-drawer.service';
import { ReceiversStore } from '../receivers/receivers.store';
import { ShipmentActionsMenu } from './shipment-actions-menu';
import { ShipmentsStore } from './shipments.store';
import { Direction, DirFilter, directionView, shipmentDirection } from './direction';
import { DATE_PRESETS, DEFAULT_DATE_KEY, datePresetLabel, inDatePreset } from './date-filter';
import { downloadCsv, formatCreated, shipmentsToCsv } from './csv';

interface Row {
  id: string;
  receiverName: string;
  fromCity: string;
  fromAddr: string;
  toCity: string;
  toAddr: string;
  created: string;
  dir: Direction;
  chip: ReturnType<typeof shipmentChipView>;
  shipment: Shipment;
}

const ALL = 'all';

/** Shipments list (spec: Shipments Screen). Filter + search + export + paginate. */
@Component({
  selector: 'app-shipments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterDropdown, Button, Icon, StatusChip, EmptyState, Skeleton, ShipmentActionsMenu],
  templateUrl: './shipments.html',
  styleUrl: './shipments.scss',
})
export class Shipments implements OnInit {
  protected readonly store = inject(ShipmentsStore);
  private readonly receivers = inject(ReceiversStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly createDrawer = inject(CreateDrawerService);

  private readonly now = new Date();
  private searchTimer?: ReturnType<typeof setTimeout>;

  protected readonly statusFilters = SHIPMENT_STATUS_FILTERS;
  protected readonly datePresets = DATE_PRESETS;

  // Filter state (initialised from the URL in ngOnInit).
  protected readonly searchRaw = signal('');
  protected readonly search = signal('');
  protected readonly statusKey = signal(ALL);
  protected readonly dirKey = signal<DirFilter>('all');
  protected readonly originKey = signal(ALL);
  protected readonly destKey = signal(ALL);
  protected readonly dateKey = signal(DEFAULT_DATE_KEY);
  /** Filter drill-down: null = category list, otherwise the open category. */
  protected readonly view = signal<'status' | 'dir' | 'origin' | 'dest' | null>(null);
  /** Search box inside a category detail view. */
  protected readonly catQuery = signal('');
  protected readonly dirOptions: { key: DirFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'inbound', label: 'Inbound' },
    { key: 'outbound', label: 'Outbound' },
  ];
  protected readonly sortDir = signal<'asc' | 'desc'>('desc');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);

  /** Real shipments (drafts live in their own view, not this list). */
  private readonly base = computed(() =>
    this.store.all().filter((s) => s.status !== 'draft'),
  );

  /** Unique origin / destination cities for the city filters. */
  protected readonly originCities = computed(() => [...new Set(this.base().map((s) => s.origin.city))].sort());
  protected readonly destCities = computed(() => [...new Set(this.base().map((s) => s.destination.city))].sort());

  /** Search + date only, before the direction / city / status filters. */
  private readonly preScope = computed(() => {
    const q = this.search().trim().toLowerCase();
    const date = this.dateKey();
    return this.base().filter(
      (s) =>
        (!q || s.id.toLowerCase().includes(q)) &&
        inDatePreset(s.createdAt, date, this.now),
    );
  });

  /** Everything except the status filter — drives the status counts. */
  private readonly scope = computed(() => {
    const dir = this.dirKey(), o = this.originKey(), d = this.destKey();
    return this.preScope().filter(
      (s) =>
        (dir === 'all' || shipmentDirection(s) === dir) &&
        (o === ALL || s.origin.city === o) &&
        (d === ALL || s.destination.city === d),
    );
  });

  protected readonly statusCounts = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = { [ALL]: this.scope().length };
    for (const f of SHIPMENT_STATUS_FILTERS) counts[f.key] = 0;
    const byStatus = new Map(
      SHIPMENT_STATUS_FILTERS.flatMap((f) => f.statuses.map((s) => [s, f.key] as const)),
    );
    for (const s of this.scope()) {
      const key = byStatus.get(s.status);
      if (key) counts[key]++;
    }
    return counts;
  });

  private readonly filtered = computed(() => {
    const key = this.statusKey();
    if (key === ALL) return this.scope();
    const def = SHIPMENT_STATUS_FILTERS.find((f) => f.key === key);
    if (!def) return this.scope();
    const set = new Set(def.statuses);
    return this.scope().filter((s) => set.has(s.status));
  });

  private readonly sorted = computed(() => {
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return [...this.filtered()].sort(
      (a, b) => (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * dir,
    );
  });

  protected readonly total = computed(() => this.sorted().length);
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly currentPage = computed(() => Math.min(this.page(), this.pageCount()));

  private readonly pagedShipments = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sorted().slice(start, start + this.pageSize());
  });

  protected readonly rows = computed<Row[]>(() =>
    this.pagedShipments().map((s) => ({
      id: s.id,
      receiverName: this.receiverName(s.receiverId),
      fromCity: s.origin.city,
      fromAddr: s.origin.line,
      toCity: s.destination.city,
      toAddr: s.destination.line,
      created: formatCreated(s.createdAt),
      dir: shipmentDirection(s),
      chip: shipmentChipView(s.status),
      shipment: s,
    })),
  );

  protected dirView(d: Direction) { return directionView(d); }

  // --- Filter drill-down navigation ---------------------------------------
  /** Reset to the category list whenever the Filter menu opens. */
  protected onFilterOpen(): void { this.view.set(null); this.catQuery.set(''); }
  /** Open a category detail (status / type / origin / destination). */
  protected openCat(cat: 'status' | 'dir' | 'origin' | 'dest'): void { this.view.set(cat); this.catQuery.set(''); }
  /** Back arrow — return to the category list. */
  protected filterBack(): void { this.view.set(null); this.catQuery.set(''); }
  /** X on a category row — clear just that category's filter. */
  protected clearCat(cat: 'status' | 'dir' | 'origin' | 'dest'): void {
    if (cat === 'status') { this.statusKey.set(ALL); this.syncUrl(); }
    else if (cat === 'dir') this.dirKey.set('all');
    else if (cat === 'origin') this.originKey.set(ALL);
    else this.destKey.set(ALL);
    this.page.set(1);
  }

  private returnToRoot(): void { this.view.set(null); this.catQuery.set(''); }
  protected selectDir(d: DirFilter): void { this.dirKey.set(d); this.page.set(1); this.returnToRoot(); }
  protected selectOrigin(c: string): void { this.originKey.set(c); this.page.set(1); this.returnToRoot(); }
  protected selectDest(c: string): void { this.destKey.set(c); this.page.set(1); this.returnToRoot(); }
  protected clearAllFilters(): void { this.statusKey.set(ALL); this.dirKey.set('all'); this.originKey.set(ALL); this.destKey.set(ALL); this.page.set(1); this.syncUrl(); }

  /** Title shown in the category detail header. */
  protected readonly catTitle = computed(() => {
    switch (this.view()) {
      case 'status': return 'Shipment status';
      case 'dir': return 'Type';
      case 'origin': return 'Origin';
      case 'dest': return 'Destination';
      default: return '';
    }
  });

  /** Option lists inside a category, filtered by the detail search box. */
  protected readonly filteredStatus = computed(() => {
    const q = this.catQuery().trim().toLowerCase();
    return q ? this.statusFilters.filter((f) => f.label.toLowerCase().includes(q)) : this.statusFilters;
  });
  protected readonly filteredOrigins = computed(() => {
    const q = this.catQuery().trim().toLowerCase();
    return q ? this.originCities().filter((c) => c.toLowerCase().includes(q)) : this.originCities();
  });
  protected readonly filteredDests = computed(() => {
    const q = this.catQuery().trim().toLowerCase();
    return q ? this.destCities().filter((c) => c.toLowerCase().includes(q)) : this.destCities();
  });

  protected readonly dirLabel = computed(() => (this.dirKey() === 'all' ? 'All' : directionView(this.dirKey() as Direction).label));
  protected readonly originLabel = computed(() => (this.originKey() === ALL ? 'All' : this.originKey()));
  protected readonly destLabel = computed(() => (this.destKey() === ALL ? 'All' : this.destKey()));
  protected readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.statusKey() !== ALL) n++;
    if (this.dirKey() !== 'all') n++;
    if (this.originKey() !== ALL) n++;
    if (this.destKey() !== ALL) n++;
    return n;
  });

  protected readonly showingFrom = computed(() =>
    this.total() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1,
  );
  protected readonly showingTo = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.total()),
  );
  protected readonly pageNumbers = computed(() =>
    Array.from({ length: this.pageCount() }, (_, i) => i + 1),
  );

  protected readonly hasActiveFilters = computed(
    () => !!this.search() || this.statusKey() !== ALL || this.dirKey() !== 'all'
      || this.originKey() !== ALL || this.destKey() !== ALL || this.dateKey() !== DEFAULT_DATE_KEY,
  );
  protected readonly statusLabel = computed(() =>
    this.statusKey() === ALL
      ? 'All'
      : (SHIPMENT_STATUS_FILTERS.find((f) => f.key === this.statusKey())?.label ?? 'All'),
  );
  protected readonly statusTriggerCount = computed(() => this.filtered().length);
  protected readonly dateLabel = computed(() => datePresetLabel(this.dateKey()));

  ngOnInit(): void {
    this.store.load();
    this.receivers.load();

    const qp = this.route.snapshot.queryParamMap;
    this.search.set(qp.get('q') ?? '');
    this.searchRaw.set(qp.get('q') ?? '');
    this.statusKey.set(qp.get('status') ?? ALL);
    this.dateKey.set(qp.get('date') ?? DEFAULT_DATE_KEY);
    this.sortDir.set(qp.get('sort') === 'asc' ? 'asc' : 'desc');
    this.page.set(Math.max(1, Number(qp.get('page')) || 1));
  }

  // --- Handlers ------------------------------------------------------------
  protected onSearchInput(value: string): void {
    this.searchRaw.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.search.set(value);
      this.page.set(1);
      this.syncUrl();
    }, 250);
  }

  protected clearSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchRaw.set('');
    this.search.set('');
    this.page.set(1);
    this.syncUrl();
  }

  protected selectStatus(key: string): void {
    this.statusKey.set(key);
    this.page.set(1);
    this.syncUrl();
    this.returnToRoot();
  }

  protected selectDate(key: string, dropdown: FilterDropdown): void {
    this.dateKey.set(key);
    this.page.set(1);
    dropdown.close();
    this.syncUrl();
  }

  protected toggleSort(): void {
    this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    this.syncUrl();
  }

  protected goToPage(n: number): void {
    if (n < 1 || n > this.pageCount()) return;
    this.page.set(n);
    this.syncUrl();
  }

  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.syncUrl();
  }

  protected clearFilters(): void {
    this.clearSearch();
    this.statusKey.set(ALL);
    this.dirKey.set('all');
    this.originKey.set(ALL);
    this.destKey.set(ALL);
    this.dateKey.set(DEFAULT_DATE_KEY);
    this.page.set(1);
    this.syncUrl();
  }

  protected openShipment(id: string): void {
    this.router.navigate(['/shipments', id]);
  }

  protected openCreate(): void {
    this.createDrawer.open();
  }

  protected exportCsv(): void {
    const set = this.sorted();
    if (!set.length) {
      this.toast.show('Nothing to export', 'error');
      return;
    }
    const csv = shipmentsToCsv(set, (id) => this.receiverName(id));
    downloadCsv(`madar-shipments-${this.isoToday()}.csv`, csv);
    this.toast.show(`Exported ${set.length} shipment${set.length === 1 ? '' : 's'}`, 'success');
  }

  // --- Helpers -------------------------------------------------------------
  private receiverName(id: string): string {
    return this.receivers.byId(id)?.name ?? id;
  }

  private isoToday(): string {
    return this.now.toISOString().slice(0, 10);
  }

  private syncUrl(): void {
    const queryParams: Record<string, string | null> = {
      q: this.search() || null,
      status: this.statusKey() === ALL ? null : this.statusKey(),
      date: this.dateKey() === DEFAULT_DATE_KEY ? null : this.dateKey(),
      sort: this.sortDir() === 'desc' ? null : 'asc',
      page: this.currentPage() === 1 ? null : String(this.currentPage()),
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected trackShipment(s: Shipment): string {
    return s.id;
  }
}
