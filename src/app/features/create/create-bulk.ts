import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics.service';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui';
import { downloadCsv } from '../shipments/csv';
import { CreateShipmentStore } from './create.store';
import {
  BULK_COLUMNS, BulkColumn, COLUMN_LABEL, buildReferenceCsv, buildTemplateCsv, mapRows, parseCsv,
} from './bulk/bulk-csv';
import { BulkRow, RefIndex, buildRefIndex, validateRow } from './bulk/bulk-model';

type Step = 'upload' | 'review' | 'processing' | 'done';
interface RowResult { n: number; ok: boolean; id?: string; reason?: string }

/** Bulk upload — download template, validate & fix in-browser, queue, log. */
@Component({
  selector: 'app-create-bulk',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  templateUrl: './create-bulk.html',
  styleUrl: './create-bulk.scss',
})
export class CreateBulk implements OnInit {
  protected readonly toast = inject(ToastService);
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(CreateShipmentStore);
  private readonly router = inject(Router);

  protected readonly cols = BULK_COLUMNS;
  protected readonly colLabel = COLUMN_LABEL;
  protected readonly refCols = new Set<BulkColumn>(['pickup_location', 'customer', 'product_type', 'vehicle_type', 'carrier', 'driver']);

  protected readonly step = signal<Step>('upload');
  protected readonly dragging = signal(false);
  protected readonly fileName = signal('');
  protected readonly rows = signal<BulkRow[]>([]);
  protected readonly onlyIssues = signal(true);

  // Processing / results
  protected readonly progress = signal(0);
  protected readonly results = signal<RowResult[]>([]);

  private today = new Date();

  private readonly ref = computed<RefIndex>(() => buildRefIndex({
    pickupLocations: this.store.pickupLocations(),
    customers: this.store.customers(),
    vehicleTypes: this.store.allVehicleTypes(),
    products: this.store.products(),
    carriers: this.store.carriers(),
    rates: [],
  }));

  // --- Review derived state ------------------------------------------------
  protected readonly total = computed(() => this.rows().length);
  protected readonly errorCount = computed(() => this.rows().filter((r) => r.status === 'error').length);
  protected readonly warnCount = computed(() => this.rows().filter((r) => r.status === 'warn').length);
  protected readonly readyCount = computed(() => this.rows().filter((r) => r.status !== 'error').length);
  protected readonly visibleRows = computed(() =>
    this.onlyIssues() ? this.rows().filter((r) => r.status !== 'ok') : this.rows());
  protected readonly canSubmit = computed(() => this.total() > 0 && this.errorCount() === 0);

  // --- Results derived state ----------------------------------------------
  protected readonly createdCount = computed(() => this.results().filter((r) => r.ok).length);
  protected readonly failedCount = computed(() => this.results().filter((r) => !r.ok).length);
  protected readonly failures = computed(() => this.results().filter((r) => !r.ok));

  protected readonly steps = [
    { n: 1, t: 'Download & fill', d: 'Grab the template and add one row per shipment.' },
    { n: 2, t: 'Upload & fix', d: 'We flag any bad rows — correct them here in the browser.' },
    { n: 3, t: 'Submit to queue', d: 'Valid rows are created as drafts a reviewer publishes.' },
  ];

  /** Stepper position (1..3); processing + done both sit on step 3. */
  protected readonly stepIndex = computed(() => {
    switch (this.step()) {
      case 'upload': return 1;
      case 'review': return 2;
      default: return 3;
    }
  });

  /** Value of the chosen <option> from a <select> change event. */
  protected selText(e: Event): string { return (e.target as HTMLSelectElement).value; }

  ngOnInit(): void { this.store.load(); }

  // --- Step 1: template + upload ------------------------------------------
  protected downloadTemplate(): void {
    const first = this.store.pickupLocations()[0]?.name ?? 'Riyadh Central Warehouse';
    const cust = this.store.customers()[0];
    const example: Record<BulkColumn, string> = {
      pickup_location: first,
      customer: cust ? cust.name : 'Al Othaim Markets',
      product_type: this.store.products()[0] ?? 'Food & beverage',
      vehicle_type: this.store.allVehicleTypes()[0] ?? 'Reefer Trailer',
      weight_kg: '12000', pieces: '20', pickup_date: this.isoIn(5),
      carrier: '', driver: '', reference: 'PO-8841', notes: 'Deliver before noon',
    };
    downloadCsv('madar-bulk-template.csv', buildTemplateCsv(example));
    this.analytics.track('bulk_template_downloaded', {});
    this.toast.show('Template downloaded');
  }

  protected downloadReference(): void {
    downloadCsv('madar-bulk-valid-values.csv', buildReferenceCsv({
      pickupLocations: this.store.pickupLocations(),
      customers: this.store.customers(),
      vehicleTypes: this.store.allVehicleTypes(),
      products: this.store.products(),
      carriers: this.store.carriers(),
    }));
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) this.readFile(file);
  }
  protected onPick(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.readFile(file);
  }

  private readFile(file: File): void {
    if (!/\.csv$/i.test(file.name)) { this.toast.show('Please upload a .csv file', 'error'); return; }
    this.fileName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => this.ingest(String(reader.result ?? ''));
    reader.onerror = () => this.toast.show('Could not read that file', 'error');
    reader.readAsText(file);
  }

  private ingest(text: string): void {
    const parsed = mapRows(parseCsv(text));
    if (parsed.missingHeaders.length) {
      this.toast.show(`Template is missing: ${parsed.missingHeaders.map((c) => this.colLabel[c]).join(', ')}`, 'error');
      return;
    }
    if (!parsed.rows.length) { this.toast.show('No data rows found', 'error'); return; }
    this.today = new Date();
    const validated = parsed.rows.map((r) => validateRow(r, this.ref(), this.today));
    this.rows.set(validated);
    this.onlyIssues.set(validated.some((r) => r.status !== 'ok'));
    this.analytics.track('bulk_uploaded', { rows: validated.length, invalidRows: validated.filter((r) => r.status === 'error').length });
    this.step.set('review');
  }

  // --- Step 2: edit & re-validate -----------------------------------------
  /** Reference cells submit a canonical label; free cells submit raw text. */
  protected editCell(rowIndex: number, col: BulkColumn, value: string): void {
    this.rows.update((rows) => rows.map((r, i) => {
      if (i !== rowIndex) return r;
      const raws = {} as Record<BulkColumn, string>;
      for (const c of BULK_COLUMNS) raws[c] = r.cells[c].raw;
      raws[col] = value;
      return validateRow({ index: r.n, cells: raws }, this.ref(), this.today);
    }));
  }

  protected reupload(): void {
    this.rows.set([]);
    this.fileName.set('');
    this.step.set('upload');
  }

  // --- Step 3 → 4: queue + log --------------------------------------------
  protected submit(): void {
    if (!this.canSubmit()) return;
    const valid = this.rows().filter((r) => r.status !== 'error');
    this.progress.set(0);
    this.results.set([]);
    this.step.set('processing');
    this.analytics.track('bulk_submitted', { rows: valid.length });

    let i = 0;
    const out: RowResult[] = [];
    const tick = () => {
      if (i >= valid.length) {
        this.results.set(out);
        this.step.set('done');
        return;
      }
      const row = valid[i];
      // Prototype: almost all succeed; the odd row fails to exercise the log.
      const fail = (row.n * 7) % 47 === 0;
      out.push(fail
        ? { n: row.n, ok: false, reason: 'Duplicate reference — a draft with this PO already exists' }
        : { n: row.n, ok: true, id: `SH-${2100 + row.n}` });
      i++;
      this.progress.set(Math.round((i / valid.length) * 100));
      setTimeout(tick, 90);
    };
    tick();
  }

  protected retryFailed(): void {
    this.results.update((rs) => rs.map((r) => (r.ok ? r : { ...r, ok: true, id: `SH-${2100 + r.n}`, reason: undefined })));
    this.toast.show('Retried — remaining rows created', 'success');
  }

  protected downloadResults(): void {
    const header = 'source_row,status,shipment_id,reason';
    const lines = this.results().map((r) => [String(r.n), r.ok ? 'created' : 'failed', r.id ?? '', r.reason ?? ''].join(','));
    downloadCsv('madar-bulk-results.csv', [header, ...lines].join('\r\n'));
  }

  protected goToDrafts(): void { this.router.navigateByUrl('/shipments'); }

  protected done(): void {
    this.rows.set([]);
    this.results.set([]);
    this.step.set('upload');
  }

  private isoIn(days: number): string {
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }
}
