/** CSV template generation + parsing for bulk shipment upload. */

import { Carrier, CreateLocation, Customer } from '../../../core/data/create.api';

/** Column keys in template order. */
export const BULK_COLUMNS = [
  'pickup_location',
  'customer',
  'product_type',
  'vehicle_type',
  'weight_kg',
  'pieces',
  'pickup_date',
  'carrier',
  'driver',
  'reference',
  'notes',
] as const;
export type BulkColumn = (typeof BULK_COLUMNS)[number];

export const COLUMN_LABEL: Record<BulkColumn, string> = {
  pickup_location: 'Pickup location',
  customer: 'Customer',
  product_type: 'Product type',
  vehicle_type: 'Vehicle type',
  weight_kg: 'Weight (kg)',
  pieces: 'Pieces',
  pickup_date: 'Pickup date',
  carrier: 'Carrier',
  driver: 'Driver',
  reference: 'Reference',
  notes: 'Notes',
};

export const REQUIRED_COLUMNS: BulkColumn[] = [
  'pickup_location', 'customer', 'product_type', 'vehicle_type', 'weight_kg', 'pieces', 'pickup_date',
];
export const REFERENCE_COLUMNS: BulkColumn[] = ['pickup_location', 'customer', 'product_type', 'vehicle_type', 'carrier', 'driver'];

function esc(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Blank template with a single illustrative example row. */
export function buildTemplateCsv(example: Record<BulkColumn, string>): string {
  const header = BULK_COLUMNS.join(',');
  const row = BULK_COLUMNS.map((c) => esc(example[c] ?? '')).join(',');
  return `${header}\r\n${row}\r\n`;
}

/** Companion "valid values" sheet so users copy from the real system lists. */
export function buildReferenceCsv(opts: {
  pickupLocations: CreateLocation[];
  customers: Customer[];
  vehicleTypes: string[];
  products: string[];
  carriers: Carrier[];
}): string {
  const lines: string[] = [];
  const section = (title: string, values: string[]) => {
    lines.push(esc(title));
    for (const v of values) lines.push(esc(v));
    lines.push('');
  };
  lines.push('Copy these exact values into the matching column. Carrier/driver are optional.');
  lines.push('');
  section('Pickup location', opts.pickupLocations.map((l) => l.name));
  section('Customer', opts.customers.map((c) => `${c.name} (${c.city})`));
  section('Product type', opts.products);
  section('Vehicle type', opts.vehicleTypes);
  section('Carrier (optional)', opts.carriers.map((c) => c.name));
  section('Driver (optional) — must match the carrier', opts.carriers.flatMap((c) => c.drivers.map((d) => `${d.name} · ${d.truck} (${c.name})`)));
  return lines.join('\r\n') + '\r\n';
}

export interface ParsedRow { index: number; cells: Record<BulkColumn, string> }
export interface ParseResult { rows: ParsedRow[]; unknownHeaders: string[]; missingHeaders: BulkColumn[] }

/** Tolerant CSV parser (quotes, escaped quotes, CRLF/LF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, ''); // strip BOM
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Map a parsed CSV to header-keyed rows, tolerating column order & casing. */
export function mapRows(grid: string[][]): ParseResult {
  if (!grid.length) return { rows: [], unknownHeaders: [], missingHeaders: [...BULK_COLUMNS] };
  const rawHeaders = grid[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const known = new Set<string>(BULK_COLUMNS);
  const unknownHeaders = rawHeaders.filter((h) => h && !known.has(h));
  const missingHeaders = REQUIRED_COLUMNS.filter((c) => !rawHeaders.includes(c));

  const rows: ParsedRow[] = grid.slice(1).map((cells, i) => {
    const rec = {} as Record<BulkColumn, string>;
    for (const col of BULK_COLUMNS) {
      const at = rawHeaders.indexOf(col);
      rec[col] = at >= 0 ? (cells[at] ?? '').trim() : '';
    }
    return { index: i + 1, cells: rec };
  });
  return { rows, unknownHeaders, missingHeaders };
}
