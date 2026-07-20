/** Validated bulk-row model — the bridge between parsed CSV and the review grid. */

import { Carrier, CreateData } from '../../../core/data/create.api';
import { BulkColumn, ParsedRow } from './bulk-csv';
import { Candidate, PRODUCT_ALIASES, resolve, VEHICLE_ALIASES } from './bulk-resolve';

export type CellStatus = 'ok' | 'error' | 'warn';

export interface Cell {
  raw: string;
  /** Resolved canonical id for reference columns (else undefined). */
  id?: string;
  /** Canonical label shown in the grid (falls back to raw). */
  display: string;
  status: CellStatus;
  message?: string;
  /** Suggestions/options for reference columns (drives the dropdown). */
  options?: Candidate[];
}

export interface BulkRow {
  /** 1-based source row number, for user-facing messages. */
  n: number;
  cells: Record<BulkColumn, Cell>;
  status: 'ok' | 'error' | 'warn';
}

/** Reference lists as resolver candidates, derived once from CreateData. */
export interface RefIndex {
  pickup: Candidate[];
  customer: Candidate[];
  product: Candidate[];
  vehicle: Candidate[];
  carrier: Candidate[];
  driversByCarrier: Map<string, Candidate[]>;
}

export function buildRefIndex(d: CreateData): RefIndex {
  return {
    pickup: d.pickupLocations.map((l) => ({ id: l.id, label: l.name, hint: l.city })),
    customer: d.customers.map((c) => ({ id: c.id, label: c.name, hint: c.city })),
    product: d.products.map((p) => ({ id: p, label: p })),
    vehicle: d.vehicleTypes.map((v) => ({ id: v, label: v })),
    carrier: d.carriers.map((c) => ({ id: c.id, label: c.name })),
    driversByCarrier: new Map(d.carriers.map((c: Carrier) => [
      c.id,
      c.drivers.map((dr) => ({ id: dr.id, label: dr.name, hint: dr.truck })),
    ])),
  };
}

const okCell = (raw: string): Cell => ({ raw, display: raw, status: 'ok' });

/** Resolve a reference cell to a canonical value, or flag it for the dropdown. */
function refCell(raw: string, candidates: Candidate[], aliases = {}, required = true): Cell {
  const r = resolve(raw, candidates, aliases);
  if (r.via === 'empty') {
    return required
      ? { raw, display: '', status: 'error', message: 'Required', options: candidates }
      : { raw, display: '', status: 'ok', options: candidates };
  }
  if (r.id) return { raw, display: r.label!, id: r.id, status: 'ok', options: candidates };
  return { raw, display: raw, status: 'error', message: `Unknown — pick a value`, options: r.suggestions.length ? r.suggestions : candidates };
}

function numberCell(raw: string): Cell {
  if (!raw) return { raw, display: '', status: 'error', message: 'Required' };
  const n = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return { raw, display: raw, status: 'error', message: 'Must be a number > 0' };
  return { raw, display: String(n), status: 'ok' };
}

function dateCell(raw: string, today: Date): Cell {
  if (!raw) return { raw, display: '', status: 'error', message: 'Required' };
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return { raw, display: raw, status: 'error', message: 'Use YYYY-MM-DD' };
  const d = new Date(t);
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (d.getTime() < startToday) return { raw, display: raw, status: 'warn', message: 'Date is in the past' };
  return { raw, display: raw, status: 'ok' };
}

/** Validate one parsed row against the reference index. */
export function validateRow(row: ParsedRow, ref: RefIndex, today: Date): BulkRow {
  const c = row.cells;
  const cells = {} as Record<BulkColumn, Cell>;

  cells.pickup_location = refCell(c.pickup_location, ref.pickup);
  cells.customer = refCell(c.customer, ref.customer);
  cells.product_type = refCell(c.product_type, ref.product, PRODUCT_ALIASES);
  cells.vehicle_type = refCell(c.vehicle_type, ref.vehicle, VEHICLE_ALIASES);
  cells.weight_kg = numberCell(c.weight_kg);
  cells.pieces = numberCell(c.pieces);
  cells.pickup_date = dateCell(c.pickup_date, today);

  // Carrier (optional) then driver (optional, scoped to the resolved carrier).
  cells.carrier = refCell(c.carrier, ref.carrier, {}, false);
  const carrierId = cells.carrier.id;
  const driverPool = carrierId ? (ref.driversByCarrier.get(carrierId) ?? []) : [];
  if (!c.driver) {
    cells.driver = { raw: '', display: '', status: 'ok', options: driverPool };
  } else if (!carrierId) {
    cells.driver = { raw: c.driver, display: c.driver, status: 'error', message: 'Set a carrier before a driver', options: [] };
  } else {
    cells.driver = refCell(c.driver, driverPool, {}, false);
    if (!cells.driver.id) cells.driver.message = 'Not in this carrier’s fleet — pick one';
  }

  cells.reference = okCell(c.reference);
  cells.notes = okCell(c.notes);

  const statuses = Object.values(cells).map((x) => x.status);
  const status: BulkRow['status'] = statuses.includes('error') ? 'error' : statuses.includes('warn') ? 'warn' : 'ok';
  return { n: row.index, cells, status };
}
