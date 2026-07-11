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

/** Apps surfaced in the app-hub launcher. */
export const APPS: AppTile[] = [
  { id: 'fasah', label: 'Fasah', icon: 'shield', tone: 'warn' },
  { id: 'afaqy', label: 'Afaqy', icon: 'truck', tone: 'info' },
  { id: 'odoo', label: 'Odoo', icon: 'building', tone: 'sky' },
  { id: 'zoho', label: 'Zoho', icon: 'receipt', tone: 'ok' },
];
