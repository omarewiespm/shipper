import { A11yModule } from '@angular/cdk/a11y';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Chart, ChartConfiguration, ChartData, ChartOptions, ScriptableContext } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ToastService } from '../../core/toast.service';
import { Avatar, Icon, IconName, Skeleton } from '../../shared/ui';
import { AiChatService } from '../ai/ai-chat.service';
import { CreateDrawerService } from '../create/create-drawer.service';
import { InvoicesStore } from '../payments/invoices.store';
import { HomeStore } from './home.store';
import { FirstShipmentPaths } from './onboarding/first-shipment-paths';
import { GettingStarted } from './onboarding/getting-started';
import { OnboardingStore } from './onboarding.store';
import { VerifyBanner } from './onboarding/verify-banner';

interface AiAction { label: string; icon: IconName; route: string; q?: string; chat?: boolean }
interface AttentionCard { count: number; label: string; tone: 'warn' | 'info' | 'neutral'; icon: IconName; route: string }
interface StatusRow { label: string; count: number; color: string; pct: number; total?: boolean }
interface Kpi { label: string; value: string; icon: IconName; sub?: string; subTone?: 'warn' | 'ok'; delta?: { text: string; up: boolean; good: boolean } }

// Chart-only palette (canvas can't read CSS vars); values mirror the tokens.
const NAVY = '#223267';
const OK = '#2FA36B';
const GRID = '#F1F3F6';
const SPEND_BAR = '#DCE2EE';
const LANE_RAMP = ['#223267', '#2E4380', '#3A5495', '#6A86B4', '#9DB0CE'];
// Hex for the status donut (canvas can't read the CSS-var colors from the API).
const STATUS_HEX: Record<string, string> = {
  'Goods delivered': '#2FA36B',
  'In transit': '#3B7DD8',
  'Order placed': '#6BA8C9',
  'Accepted': '#9AB6CC',
  'Delayed': '#E0A43B',
};

/** Home (reporting) page — AI hero, attention, status bar-list, trends, lanes, ship-again. */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, NgTemplateOutlet, RouterLink, Icon, Avatar, Skeleton, BaseChartDirective, VerifyBanner, FirstShipmentPaths, GettingStarted],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  protected readonly store = inject(HomeStore);
  protected readonly onboarding = inject(OnboardingStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly aiChat = inject(AiChatService);
  private readonly createDrawer = inject(CreateDrawerService);
  private readonly invoices = inject(InvoicesStore);

  /** Overdue invoices alert — count + total, links to the filtered invoices list. */
  protected readonly overdue = computed(() => ({
    count: this.invoices.totals().overdueCount,
    amount: this.invoices.totals().overdue,
  }));

  // --- Ship-again lanes drawer ---------------------------------------------
  protected readonly lanesOpen = signal(false);
  protected readonly laneQuery = signal('');
  protected readonly uniqueLanes = computed(() => {
    const m = new Map<string, number>();
    for (const l of this.store.lanes()) if (!m.has(l.label)) m.set(l.label, 0);
    for (const r of this.store.receivers()) m.set(r.lane, (m.get(r.lane) ?? 0) + r.count);
    return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  });
  protected readonly filteredLanes = computed(() => {
    const q = this.laneQuery().trim().toLowerCase();
    return this.uniqueLanes().filter((l) => !q || l.label.toLowerCase().includes(q));
  });
  protected openLanes(): void { this.laneQuery.set(''); this.lanesOpen.set(true); }
  protected shipLane(): void { this.lanesOpen.set(false); this.createDrawer.open(); }

  protected readonly company = 'Rawabi Trading Co.';
  protected readonly greeting = 'Good morning,';

  constructor() {
    Chart.defaults.font.family = '"Readex Pro", sans-serif';
    Chart.defaults.font.size = 11;
    Chart.defaults.color = '#8A90A0';
  }

  ngOnInit(): void {
    this.onboarding.load();
    this.store.load();
    this.invoices.load();
  }

  // --- Attention -----------------------------------------------------------
  protected readonly attentionCards = computed<AttentionCard[]>(() => {
    const a = this.store.attention();
    return [
      { count: a?.pendingDeliveryNotes ?? 0, label: 'Pending delivery notes', tone: 'warn', icon: 'file-check', route: '/shipments' },
      { count: a?.priceChanges ?? 0, label: 'Price change to approve', tone: 'info', icon: 'percent', route: '/signing' },
      { count: a?.invoicesDue ?? 0, label: 'Invoices due', tone: 'neutral', icon: 'receipt', route: '/payments' },
    ];
  });

  // --- Status bar-list -----------------------------------------------------
  protected readonly statusRows = computed<StatusRow[]>(() => {
    const s = this.store.status();
    if (!s) return [];
    const total = s.total || 1;
    const rows: StatusRow[] = [
      { label: 'All shipments', count: s.total, color: 'var(--navy)', pct: 100, total: true },
    ];
    for (const r of s.rows) {
      rows.push({ label: r.label, count: r.count, color: r.color, pct: Math.round((r.count / total) * 100) });
    }
    return rows;
  });

  // --- KPI tiles (what a shipper checks first) -----------------------------
  protected readonly kpis = computed<Kpi[]>(() => {
    const s = this.store.status(), sp = this.store.spend(), v = this.store.volume(), ot = this.store.onTime();
    if (!s || !sp || !v) return [];
    const find = (l: string) => s.rows.find((r) => r.label === l)?.count ?? 0;
    const delivered = find('Goods delivered'), delayed = find('Delayed');
    const active = s.total - delivered;
    const last = <T,>(a: T[], i = 0) => a[a.length - 1 - i];
    const spNow = last(sp.values), spPrev = last(sp.values, 1) ?? spNow;
    const vNow = last(v.values), vPrev = last(v.values, 1) ?? vNow;
    const costNow = Math.round((spNow * 1000) / vNow), costPrev = Math.round((spPrev * 1000) / vPrev);
    const otNow = ot ? last(ot.values) : s.onTimePct, otPrev = ot ? (last(ot.values, 1) ?? otNow) : otNow;
    const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : 0);
    const dPts = (d: number) => ({ text: `${d >= 0 ? '+' : ''}${d} pts`, up: d >= 0, good: d >= 0 });
    const dPct = (p: number, lowerIsGood: boolean) => ({ text: `${p >= 0 ? '+' : ''}${p}%`, up: p >= 0, good: lowerIsGood ? p <= 0 : p >= 0 });
    return [
      { label: 'Active shipments', value: `${active}`, icon: 'package', sub: `${delayed} delayed`, subTone: delayed > 0 ? 'warn' : 'ok' },
      { label: 'On-time delivery', value: `${otNow}%`, icon: 'gauge', delta: dPts(otNow - otPrev) },
      { label: 'Spend this month', value: `SAR ${spNow}k`, icon: 'wallet', delta: dPct(pct(spNow, spPrev), false) },
      { label: 'Cost / shipment', value: `SAR ${costNow}`, icon: 'receipt', delta: dPct(pct(costNow, costPrev), true) },
    ];
  });

  // --- Status donut + legend ----------------------------------------------
  protected readonly statusTotal = computed(() => this.store.status()?.total ?? 0);
  protected readonly statusLegend = computed(() => {
    const s = this.store.status();
    if (!s) return [];
    const total = s.total || 1;
    return s.rows.map((r) => ({ label: r.label, count: r.count, color: STATUS_HEX[r.label] ?? NAVY, pct: Math.round((r.count / total) * 100) }));
  });
  protected readonly statusDonut = computed<ChartData<'doughnut'>>(() => {
    const s = this.store.status();
    return {
      labels: s?.rows.map((r) => r.label) ?? [],
      datasets: [{
        data: s?.rows.map((r) => r.count) ?? [],
        backgroundColor: s?.rows.map((r) => STATUS_HEX[r.label] ?? NAVY) ?? [],
        borderColor: '#fff', borderWidth: 2, hoverOffset: 6,
      }],
    };
  });
  protected readonly donutOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false, cutout: '70%',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed}` } } },
  };

  // --- On-time delivery trend ---------------------------------------------
  protected readonly onTimeData = computed<ChartData<'line'>>(() => {
    const ot = this.store.onTime();
    return {
      labels: ot?.labels ?? [],
      datasets: [{
        data: ot?.values ?? [],
        borderColor: OK, borderWidth: 2.5, tension: 0.4,
        pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: OK, pointBorderColor: '#fff', pointBorderWidth: 2,
        fill: true,
        backgroundColor: (ctx: ScriptableContext<'line'>) => {
          const area = ctx.chart.chartArea;
          if (!area) return 'transparent';
          const g = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
          g.addColorStop(0, 'rgba(47,163,107,.18)');
          g.addColorStop(1, 'rgba(47,163,107,0)');
          return g;
        },
      }],
    };
  });
  protected readonly onTimeOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index', callbacks: { label: (c) => `${c.parsed.y}% on-time` } } },
    scales: {
      y: { suggestedMin: 80, suggestedMax: 100, grid: { color: GRID }, border: { display: false }, ticks: { maxTicksLimit: 5, callback: (v) => `${v}%` } },
      x: { grid: { display: false }, border: { display: false } },
    },
  };
  protected readonly onTimeSummary = computed(() => {
    const ot = this.store.onTime();
    return ot ? `On-time delivery %, last 8 months: ${ot.labels.map((l, i) => `${l} ${ot.values[i]}%`).join(', ')}.` : '';
  });

  // --- Charts --------------------------------------------------------------
  protected readonly volumeData = computed<ChartData<'line'>>(() => {
    const v = this.store.volume();
    return {
      labels: v?.labels ?? [],
      datasets: [{
        data: v?.values ?? [],
        borderColor: NAVY,
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: NAVY,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: true,
        backgroundColor: (ctx: ScriptableContext<'line'>) => {
          const area = ctx.chart.chartArea;
          if (!area) return 'transparent';
          const g = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
          g.addColorStop(0, 'rgba(34,50,103,.18)');
          g.addColorStop(1, 'rgba(34,50,103,0)');
          return g;
        },
      }],
    };
  });

  protected readonly volumeOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' } },
    scales: {
      y: { beginAtZero: true, grid: { color: GRID }, border: { display: false }, ticks: { maxTicksLimit: 5 } },
      x: { grid: { display: false }, border: { display: false } },
    },
  };

  protected readonly spendData = computed<ChartData<'bar'>>(() => {
    const s = this.store.spend();
    return {
      labels: s?.labels ?? [],
      datasets: [{
        data: s?.values ?? [],
        backgroundColor: SPEND_BAR,
        hoverBackgroundColor: NAVY,
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 26,
      }],
    };
  });

  protected readonly spendOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => `${c.parsed.y}k SAR` } },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: GRID }, border: { display: false }, ticks: { maxTicksLimit: 5, callback: (v) => `${v}k` } },
      x: { grid: { display: false }, border: { display: false } },
    },
  };

  protected readonly laneData = computed<ChartData<'bar'>>(() => {
    const lanes = this.store.lanes();
    return {
      labels: lanes.map((l) => l.label),
      datasets: [{
        data: lanes.map((l) => l.value),
        backgroundColor: lanes.map((_, i) => LANE_RAMP[i] ?? LANE_RAMP[LANE_RAMP.length - 1]),
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 22,
      }],
    };
  });

  protected readonly laneOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => `${Number(c.parsed.x).toLocaleString()} SAR` } },
    },
    scales: {
      x: { beginAtZero: true, grid: { color: GRID }, border: { display: false }, ticks: { callback: (v) => `${Number(v) / 1000}k` } },
      y: { grid: { display: false }, border: { display: false }, ticks: { color: '#1F2733', font: { size: 12 } } },
    },
  };

  protected readonly volumeSummary = computed(() => {
    const v = this.store.volume();
    if (!v) return '';
    return `Shipment volume, last 8 months: ${v.labels.map((l, i) => `${l} ${v.values[i]}`).join(', ')}.`;
  });
  protected readonly spendSummary = computed(() => {
    const s = this.store.spend();
    if (!s) return '';
    return `Spend in thousands SAR, last 8 months: ${s.labels.map((l, i) => `${l} ${s.values[i]}k`).join(', ')}.`;
  });
  protected readonly laneSummary = computed(() =>
    'Top routes this month by spend: ' + this.store.lanes().map((l) => `${l.label} ${l.value.toLocaleString()} SAR`).join(', ') + '.',
  );

  // --- AI hero -------------------------------------------------------------
  protected readonly aiOpen = signal(false);
  protected readonly aiActions: AiAction[] = [
    { label: 'Create a shipment', icon: 'plus', route: '/shipments/create', q: 'I want to create a new shipment' },
    { label: 'Track a shipment', icon: 'map-pin', route: '/tracking' },
    { label: 'Review invoices due', icon: 'wallet', route: '/payments' },
    { label: 'Add a partner', icon: 'users', route: '/partners' },
    { label: 'Open a report', icon: 'report', route: '/reports' },
    { label: 'Manage my team', icon: 'user', route: '/settings/users' },
  ];

  protected selectAi(o: AiAction): void {
    this.aiOpen.set(false);
    this.aiChat.open(o.q ?? o.label);
  }
  protected voice(e: Event): void {
    e.stopPropagation();
    this.toast.show('Voice input coming soon');
  }

  // --- Ship again ----------------------------------------------------------
  protected shipAgain(id: string): void {
    this.router.navigate(['/create'], { queryParams: { receiver: id } });
  }
}
