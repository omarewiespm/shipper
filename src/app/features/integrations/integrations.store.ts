import { computed, Injectable, signal } from '@angular/core';
import { IconName } from '../../shared/ui';

export type IntCategory = 'avl' | 'erp' | 'accounting' | 'government';

export interface Integration {
  id: string;
  name: string;
  provider: string;
  category: IntCategory;
  tagline: string;
  initials: string;
  color: string;
  /** Brand domain — used to fetch the real favicon/logo (empty = monogram only). */
  domain: string;
  rating: number;
  installs: number;
  connected: boolean;
  popular?: boolean;
}

export interface Review { author: string; role: string; rating: number; when: string; text: string; }

/** 1.2k / 8k / 340 style compact count. */
export function formatInstalls(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`;
}

/** Real brand logo via Google's favicon service; falls back to the monogram tile. */
export function logoUrl(domain: string): string {
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : '';
}

export interface IntStep { title: string; detail: string; }
export interface IntDetail {
  about: string;
  scopes: string[];
  prerequisites: string[];
  steps: IntStep[];
  video: string;
}

/** Shape consumed by the header app-hub launcher (kept for compatibility). */
export interface ConnectedApp { id: string; label: string; icon: IconName; tone: string; }

export const CATEGORIES: { key: IntCategory; label: string; blurb: string; icon: IconName }[] = [
  { key: 'avl', label: 'Vehicle tracking (AVL)', blurb: 'TGA-approved telematics for live truck location.', icon: 'truck' },
  { key: 'erp', label: 'ERP systems', blurb: 'Sync orders, master data and status with your ERP.', icon: 'building' },
  { key: 'accounting', label: 'Accounting', blurb: 'Push invoices, payments and VAT to your books.', icon: 'receipt' },
  { key: 'government', label: 'Government & compliance', blurb: 'Identity, records and regulatory submissions.', icon: 'shield' },
];

const CAT_ICON: Record<IntCategory, IconName> = { avl: 'truck', erp: 'building', accounting: 'receipt', government: 'shield' };
const CAT_TONE: Record<IntCategory, string> = { avl: 'ok', erp: 'info', accounting: 'sky', government: 'warn' };

export function categoryLabel(c: IntCategory): string {
  return CATEGORIES.find((x) => x.key === c)?.label ?? c;
}

/** App-store style integrations catalog + connection state (mock). */
@Injectable({ providedIn: 'root' })
export class IntegrationsStore {
  private readonly _all = signal<Integration[]>(CATALOG);
  readonly all = this._all.asReadonly();

  readonly query = signal('');
  readonly category = signal<IntCategory | 'all' | 'installed'>('all');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.category();
    const matches = (a: Integration) => !q || `${a.name} ${a.provider} ${a.tagline}`.toLowerCase().includes(q);
    return this._all().filter((a) => {
      if (cat === 'installed') return a.connected && matches(a);
      // "All" and category tabs only show apps you haven't connected yet.
      if (a.connected) return false;
      if (cat !== 'all' && a.category !== cat) return false;
      return matches(a);
    });
  });

  readonly installed = computed(() => this._all().filter((a) => a.connected));
  readonly installedCount = computed(() => this.installed().length);
  /** Counts reflect what each tab shows — available (not-yet-connected) apps. */
  readonly countByCategory = computed(() => {
    const m: Record<string, number> = { all: 0 };
    for (const a of this._all()) {
      if (a.connected) continue;
      m['all']++;
      m[a.category] = (m[a.category] ?? 0) + 1;
    }
    return m;
  });

  /** Consumed by the header app-hub. */
  readonly connected = computed<ConnectedApp[]>(() =>
    this.installed().map((a) => ({ id: a.id, label: a.name, icon: CAT_ICON[a.category], tone: CAT_TONE[a.category] })),
  );

  byId(id: string): Integration | undefined {
    return this._all().find((a) => a.id === id);
  }

  setConnected(id: string, connected: boolean): void {
    this._all.update((list) => list.map((a) => (a.id === id ? { ...a, connected } : a)));
  }

  /** Reviews — a deterministic slice of the pool, personalised with the app name. */
  reviews(app: Integration): Review[] {
    const start = ihash(app.id) % REVIEW_POOL.length;
    return Array.from({ length: 4 }, (_, i) => REVIEW_POOL[(start + i) % REVIEW_POOL.length])
      .map((r) => ({ ...r, text: r.text.replace(/\{name\}/g, app.name) }));
  }

  /** Detail content — generated from a per-category template with the app name. */
  detail(app: Integration): IntDetail {
    const t = TEMPLATES[app.category];
    const fill = (s: string) => s.replace(/\{name\}/g, app.name);
    return {
      about: fill(t.about),
      scopes: t.scopes.map(fill),
      prerequisites: t.prerequisites.map(fill),
      steps: t.steps.map((s) => ({ title: fill(s.title), detail: fill(s.detail) })),
      video: `How ${app.name} connects to Madar · 2:${(app.id.length + 8)}`,
    };
  }
}

const TEMPLATES: Record<IntCategory, IntDetail> = {
  avl: {
    about: '{name} streams live GPS from your trucks into Madar so every in-transit shipment tracks in real time — no manual updates.',
    scopes: [
      'Live GPS location of your assigned trucks',
      'Speed, heading, route & geofence events',
      'Trip history attached to delivered shipments',
      'Vehicle & driver identifiers (nothing beyond what you already hold)',
    ],
    prerequisites: [
      'An active {name} account with API access enabled',
      'Your fleet devices registered and reporting on {name}',
      'An API key & secret from your {name} dashboard',
    ],
    steps: [
      { title: 'Connect your account', detail: 'Paste your {name} API key & secret, or sign in with OAuth.' },
      { title: 'Authorize location access', detail: 'Grant Madar read access to your vehicles’ live positions.' },
      { title: 'Map your vehicles', detail: 'Match {name} device IDs to your Madar trucks — once only.' },
      { title: 'Go live', detail: 'In-transit shipments start tracking on the live map instantly.' },
    ],
    video: '',
  },
  erp: {
    about: 'Keep {name} and Madar in sync — shipments flow from your orders, and delivery status flows back, with no double entry.',
    scopes: [
      'Create shipments from {name} sales / purchase orders',
      'Push delivery status, ETA & proof-of-delivery back to {name}',
      'Sync master data: customers, items and addresses',
      'Reconcile freight cost & invoices against orders',
    ],
    prerequisites: [
      'A {name} instance with an integration / API user',
      'Admin permission to install connectors in {name}',
      'API credentials or an OAuth app registered in {name}',
    ],
    steps: [
      { title: 'Connect {name}', detail: 'Authenticate with your integration user or OAuth app.' },
      { title: 'Choose what syncs', detail: 'Pick which order types create shipments and which fields map back.' },
      { title: 'Map fields', detail: 'Align customers, addresses and units between {name} and Madar.' },
      { title: 'Activate sync', detail: 'Turn on the two-way sync — new orders start flowing.' },
    ],
    video: '',
  },
  accounting: {
    about: 'Send Madar invoices, credit notes and payments straight into {name}, with VAT handled the ZATCA way.',
    scopes: [
      'Export shipment invoices & credit notes to {name}',
      'Sync payment status & receipts both ways',
      'Map ledgers, VAT tax codes & customers',
      'Automated reconciliation of shipment charges',
    ],
    prerequisites: [
      'A {name} account on a plan that allows API / app connections',
      'Admin access to authorize third-party apps',
      'Your chart of accounts & VAT codes set up in {name}',
    ],
    steps: [
      { title: 'Sign in to {name}', detail: 'Authorize Madar via {name}’s secure OAuth screen.' },
      { title: 'Map accounts & VAT', detail: 'Match Madar charge types to your {name} ledgers and tax codes.' },
      { title: 'Set the schedule', detail: 'Choose real-time or daily export of invoices & payments.' },
      { title: 'Reconcile', detail: 'Payments and receipts sync back automatically.' },
    ],
    video: '',
  },
  government: {
    about: '{name} lets Madar complete the official checks and submissions your shipments legally require — inline, no side portals.',
    scopes: [
      'Verify identities, CRs & records via {name}',
      'Submit and retrieve official documents',
      'Run the compliance checks required by regulation',
      'Keep an auditable trail of every submission',
    ],
    prerequisites: [
      'An authorized {name} business account for your company',
      'A signed data-sharing / usage agreement with {name}',
      'Your company registration (CR) verified on Madar',
    ],
    steps: [
      { title: 'Authorize with Nafath', detail: 'Confirm your company’s authority to use {name} via national SSO.' },
      { title: 'Grant scopes', detail: 'Approve exactly which checks Madar may perform on your behalf.' },
      { title: 'Confirm agreement', detail: 'Accept {name}’s usage terms — required by the regulator.' },
      { title: 'Enable', detail: 'Required checks now run automatically at the right step.' },
    ],
    video: '',
  },
};

type RawInt = Omit<Integration, 'rating' | 'installs'>;

function ihash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function deriveRating(id: string): number { return Math.round((4.3 + (ihash(id) % 7) / 10) * 10) / 10; }
function deriveInstalls(id: string, popular?: boolean): number {
  const base = popular ? 2200 : 240;
  return base + (ihash(id + 'x') % (popular ? 6200 : 1900));
}

const REVIEW_POOL: Review[] = [
  { author: 'Faisal Al Harbi', role: 'Operations Manager', rating: 5, when: '2 weeks ago', text: 'Setup took ten minutes and {name} data started flowing straight away. Exactly what we needed.' },
  { author: 'Reem Al Otaibi', role: 'Logistics Lead', rating: 5, when: '1 month ago', text: 'No more manual updates between {name} and Madar. It just stays in sync.' },
  { author: 'Omar Baeshen', role: 'Finance', rating: 4, when: '1 month ago', text: 'Solid integration — would love a few more mapping options, but it does the job well.' },
  { author: 'Sara Al Dosari', role: 'Fleet Supervisor', rating: 5, when: '2 months ago', text: 'Support helped us map everything quickly. Reliable since day one.' },
  { author: 'Khalid Al Qahtani', role: 'IT Administrator', rating: 4, when: '3 months ago', text: 'Clean OAuth flow and clear scopes. Docs could be a little deeper.' },
  { author: 'Nora Al Shehri', role: 'Procurement', rating: 5, when: '3 months ago', text: 'Connecting {name} saved our team hours every week. Highly recommend.' },
];

const RAW: RawInt[] = [
  // AVL / telematics
  { id: 'afaqi', name: 'Afaqy', provider: 'Afaqy', category: 'avl', tagline: 'TGA-approved AVL for real-time truck tracking across the Kingdom.', initials: 'AF', color: '#1F7A6D', domain: 'afaqy.com', connected: true, popular: true },
  { id: 'saudi-avl', name: 'Saudi AVL', provider: 'Saudi Automatic Vehicle Location', category: 'avl', tagline: 'National AVL network integrated with the TGA e-waybill.', initials: 'SA', color: '#2E7D32', domain: '', connected: false, popular: true },
  { id: 'wialon', name: 'Wialon', provider: 'Gurtam', category: 'avl', tagline: 'GPS fleet tracking & telematics used across MENA.', initials: 'WL', color: '#E53935', domain: 'wialon.com', connected: false },
  { id: 'mix', name: 'MiX Telematics', provider: 'MiX by Powerfleet', category: 'avl', tagline: 'Fleet telematics with driver safety & fuel insight.', initials: 'MX', color: '#0B5FA5', domain: 'mixtelematics.com', connected: false },
  { id: 'teltonika', name: 'Teltonika', provider: 'Teltonika Telematics', category: 'avl', tagline: 'GPS trackers and IoT devices for logistics fleets.', initials: 'TK', color: '#111827', domain: 'teltonika-gps.com', connected: false },
  { id: 'rakeb', name: 'Rakeb', provider: 'Rakeb Fleet', category: 'avl', tagline: 'Saudi fleet tracking & driver management platform.', initials: 'RK', color: '#C2410C', domain: '', connected: false },

  // ERP
  { id: 'sap-s4', name: 'SAP S/4HANA', provider: 'SAP', category: 'erp', tagline: 'Enterprise ERP — sync orders, logistics & costing.', initials: 'SAP', color: '#0A6ED1', domain: 'sap.com', connected: false, popular: true },
  { id: 'netsuite', name: 'Oracle NetSuite', provider: 'Oracle', category: 'erp', tagline: 'Cloud ERP for orders, inventory & finance.', initials: 'NS', color: '#1B3A57', domain: 'netsuite.com', connected: false },
  { id: 'dynamics', name: 'Dynamics 365', provider: 'Microsoft', category: 'erp', tagline: 'Supply chain & finance ERP from Microsoft.', initials: 'D3', color: '#0067B8', domain: 'microsoft.com', connected: false },
  { id: 'odoo', name: 'Odoo', provider: 'Odoo S.A.', category: 'erp', tagline: 'Open-source ERP with inventory & sales apps.', initials: 'OD', color: '#7C5DFA', domain: 'odoo.com', connected: true },
  { id: 'sap-b1', name: 'SAP Business One', provider: 'SAP', category: 'erp', tagline: 'ERP for small & mid-size businesses.', initials: 'B1', color: '#0A6ED1', domain: 'sap.com', connected: false },

  // Accounting
  { id: 'quickbooks', name: 'QuickBooks', provider: 'Intuit', category: 'accounting', tagline: 'Invoicing & accounting for growing businesses.', initials: 'QB', color: '#2CA01C', domain: 'quickbooks.intuit.com', connected: true, popular: true },
  { id: 'xero', name: 'Xero', provider: 'Xero', category: 'accounting', tagline: 'Cloud accounting with bank feeds & VAT.', initials: 'XE', color: '#13B5EA', domain: 'xero.com', connected: false, popular: true },
  { id: 'zoho-books', name: 'Zoho Books', provider: 'Zoho', category: 'accounting', tagline: 'VAT-ready accounting integrated with Zoho.', initials: 'ZB', color: '#E42527', domain: 'zoho.com', connected: false },
  { id: 'wafeq', name: 'Wafeq', provider: 'Wafeq', category: 'accounting', tagline: 'Saudi ZATCA-compliant accounting & e-invoicing.', initials: 'WF', color: '#4338CA', domain: 'wafeq.com', connected: false, popular: true },
  { id: 'sage', name: 'Sage', provider: 'Sage Group', category: 'accounting', tagline: 'Accounting & payroll for SMBs and enterprises.', initials: 'SG', color: '#0F9D58', domain: 'sage.com', connected: false },

  // Government & compliance
  { id: 'yakeen', name: 'Yakeen', provider: 'Elm / NIC', category: 'government', tagline: 'Identity & commercial-record verification service.', initials: 'YK', color: '#0E7490', domain: 'elm.sa', connected: true, popular: true },
  { id: 'bayan', name: 'Bayan', provider: 'SIMAH', category: 'government', tagline: 'Business credit & commercial information bureau.', initials: 'BY', color: '#334155', domain: 'simah.com', connected: false },
  { id: 'athr', name: 'Athr', provider: 'Athr Platform', category: 'government', tagline: 'Regulatory shipment audit trail & attestation.', initials: 'AT', color: '#7C3AED', domain: '', connected: false },
  { id: 'zatca', name: 'ZATCA Fatoora', provider: 'ZATCA', category: 'government', tagline: 'Phase-2 e-invoicing clearance & reporting.', initials: 'ZT', color: '#0F766E', domain: 'zatca.gov.sa', connected: true, popular: true },
  { id: 'fasah', name: 'Fasah', provider: 'TGA / Tabadul', category: 'government', tagline: 'Customs & cross-border single-window platform.', initials: 'FS', color: '#B45309', domain: 'fasah.sa', connected: false },
  { id: 'nafath', name: 'Nafath', provider: 'NIC', category: 'government', tagline: 'National single sign-on for authorized access.', initials: 'NF', color: '#166534', domain: 'nafath.gov.sa', connected: false },
];

const CATALOG: Integration[] = RAW.map((a) => ({ ...a, rating: deriveRating(a.id), installs: deriveInstalls(a.id, a.popular) }));
