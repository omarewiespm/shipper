/* Maps domain enums to their visual treatment (UI spec §1.2 / §3.3–3.4).
   Pure functions so any component can derive chips without duplicating rules. */

import {
  CapacitySource,
  InvoiceStatus,
  ShipmentStatus,
} from '../../../models';

export type Tone = 'ok' | 'warn' | 'info' | 'sky' | 'neutral' | 'danger';

export interface ChipView {
  label: string;
  tone: Tone;
  pulse: boolean;
}

/**
 * Canonical shipment-status vocabulary (Shipments screen spec §3.2/§4.4).
 * Each display status groups one or more granular enum statuses, so chip
 * labels and filter labels stay identical everywhere.
 */
export interface ShipmentStatusFilter {
  key: string;
  label: string;
  tone: Tone;
  statuses: ShipmentStatus[];
}

export const SHIPMENT_STATUS_FILTERS: readonly ShipmentStatusFilter[] = [
  { key: 'posted',        label: 'Order placed',                tone: 'sky',    statuses: ['posted'] },
  { key: 'accepted',      label: 'Accepted',                    tone: 'sky',    statuses: ['accepted', 'driver_accepted'] },
  { key: 'in_transit',    label: 'In transit',                  tone: 'info',   statuses: ['in_transit'] },
  { key: 'at_pickup',     label: 'Arrived pickup location',     tone: 'info',   statuses: ['at_pickup'] },
  { key: 'loaded',        label: 'Goods loaded',                tone: 'info',   statuses: ['loaded'] },
  { key: 'arrived',       label: 'Arrived drop-off location',   tone: 'info',   statuses: ['arrived'] },
  { key: 'delivered',     label: 'Goods delivered',             tone: 'ok',     statuses: ['delivered', 'completed'] },
  { key: 'cancelled',     label: 'Cancelled',                   tone: 'danger', statuses: ['cancelled', 'rejected'] },
  { key: 'not_fulfilled', label: 'Not fulfilled',               tone: 'warn',   statuses: ['not_fulfilled'] },
] as const;

const STATUS_TO_FILTER = new Map<ShipmentStatus, ShipmentStatusFilter>(
  SHIPMENT_STATUS_FILTERS.flatMap((f) => f.statuses.map((s) => [s, f] as const)),
);

/** Strict chip (no "Delayed" derivation) — labels match the filter set exactly. */
export function shipmentChipView(status: ShipmentStatus): ChipView {
  const f = STATUS_TO_FILTER.get(status);
  return {
    label: f?.label ?? 'Draft',
    tone: f?.tone ?? 'neutral',
    pulse: status === 'in_transit',
  };
}

/** Dashboard variant: an in-transit shipment past its ETA reads "Delayed". */
export function shipmentStatusView(
  status: ShipmentStatus,
  etaAt?: string,
  now: number = Date.parse('2026-07-03T12:00:00+03:00'),
): ChipView {
  if (status === 'in_transit' && etaAt && Date.parse(etaAt) < now) {
    return { label: 'Delayed', tone: 'warn', pulse: true };
  }
  return shipmentChipView(status);
}

export function invoiceStatusView(status: InvoiceStatus): ChipView {
  switch (status) {
    case 'paid':    return { label: 'Paid', tone: 'ok', pulse: false };
    case 'due':     return { label: 'Due', tone: 'warn', pulse: false };
    case 'overdue': return { label: 'Overdue', tone: 'danger', pulse: false };
  }
}

export interface CapacityView {
  label: string;
  variant: 'ok' | 'info' | 'outline';
}

export function capacityView(source: CapacitySource): CapacityView {
  switch (source) {
    case 'own_carrier': return { label: 'Own carrier', variant: 'ok' };
    case 'rental':      return { label: 'Rental', variant: 'info' };
    case 'marketplace': return { label: 'Bidding', variant: 'outline' };
  }
}
