import { IconName } from '../shared/ui';

export interface NavChild {
  label: string;
  route: string;
}

export interface NavItem {
  label: string;
  route: string;
  icon: IconName;
  /** Badge signal key resolved by the sidebar (attention counts). */
  badgeKey?: 'shipments';
  children?: NavChild[];
}

/**
 * Information architecture (requirements §4, locked). "Create shipment" is the
 * first row (not a button); a divider separates it, and another divides
 * "run my day" from "configure".
 */
export const CREATE_NAV: NavItem = {
  label: 'Create Shipment',
  route: '/shipments/create',
  icon: 'plus',
};

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Home', route: '/home', icon: 'home' },
  { label: 'Shipments', route: '/shipments', icon: 'package' },
  {
    label: 'Orders',
    route: '/partners/sales',
    icon: 'receipt',
    children: [
      { label: 'Sales Order', route: '/partners/sales' },
      { label: 'Purchase Order', route: '/partners/po' },
    ],
  },
  {
    label: 'Partners',
    route: '/partners',
    icon: 'network',
    children: [
      { label: 'Directory', route: '/partners/directory' },
    ],
  },
  {
    label: 'Carriers',
    route: '/carriers',
    icon: 'truck',
    children: [
      { label: 'Directory', route: '/carriers/directory' },
      { label: 'Active carriers', route: '/carriers/map' },
      { label: 'Delivery notes', route: '/carriers/delivery-notes' },
    ],
  },
  { label: 'Live tracking', route: '/tracking', icon: 'map-pin' },
  {
    label: 'Financials',
    route: '/payments',
    icon: 'wallet',
    children: [
      { label: 'Wallet', route: '/payments/wallet' },
      { label: 'Invoices', route: '/payments/invoices' },
    ],
  },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    label: 'Reports',
    route: '/reports',
    icon: 'report',
    children: [
      { label: 'Spend', route: '/reports/spend' },
      { label: 'Volume', route: '/reports/volume' },
      { label: 'On-time', route: '/reports/on-time' },
      { label: 'Carrier performance', route: '/reports/carriers' },
      { label: 'Lane analysis', route: '/reports/lanes' },
    ],
  },
  {
    label: 'Manage',
    route: '/settings',
    icon: 'settings',
    children: [
      { label: 'Team', route: '/settings/users' },
      { label: 'Locations', route: '/settings/branches' },
    ],
  },
  { label: 'Integrations', route: '/integrations', icon: 'integrations' },
];
