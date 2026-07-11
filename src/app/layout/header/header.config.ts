import { IconName } from '../../shared/ui';

/**
 * Rotating search placeholder words (spec). Data-driven so they translate and
 * extend later; wire to Transloco keys in the i18n pass. Order is fixed.
 */
export const SEARCH_PREFIX = 'Search ';
// Vocabulary locked to the nav labels: Receivers / Carriers (not Customers/Fleets).
export const SEARCH_WORDS = ['Shipments', 'Invoices', 'Receivers', 'Carriers'];

export interface AppTile {
  id: string;
  label: string;
  icon: IconName;
  tone: string;
  /** The current app — rendered as active, not navigable. */
  active?: boolean;
}

/** Madar app family for the app-hub launcher. */
export const MADAR_APPS: AppTile[] = [
  { id: 'shipper', label: 'Shipper', icon: 'package', tone: 'navy', active: true },
  { id: 'fleet', label: 'Fleet Manager', icon: 'truck', tone: 'info' },
  { id: 'driver', label: 'Driver', icon: 'car', tone: 'sky' },
  { id: 'admin', label: 'Admin', icon: 'shield', tone: 'warn' },
];
