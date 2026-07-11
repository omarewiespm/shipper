/* =============================================================================
   Domain enums — requirements §7. Names align to the real API when provided.
   ============================================================================= */

/** Source of capacity. NOT a user type — downstream behaviour is identical. */
export type CapacitySource = 'own_carrier' | 'marketplace' | 'rental';

/** Every shipment's price is exactly one of these three. */
export type PriceModel = 'contract' | 'accepted_bid' | 'signed_amendment';

/** Lifecycle mirrors the current dashboard's "Orders Status". */
export type ShipmentStatus =
  | 'draft'
  | 'posted'
  | 'accepted'
  | 'driver_accepted'
  | 'at_pickup'
  | 'loaded'          // waybill signed at origin
  | 'in_transit'
  | 'arrived'
  | 'delivered'       // delivery note signed at destination
  | 'completed'
  | 'not_fulfilled'
  | 'cancelled'
  | 'rejected';

export type DocumentType =
  | 'waybill'
  | 'contract'
  | 'bayan'
  | 'delivery_note'
  | 'invoice'
  | 'pod'
  | 'price_amendment';

export type CarrierKind = 'own' | 'marketplace';
export type CarrierStatus = 'invited' | 'active' | 'blocked' | 'contracted';

export type AmendmentStatus = 'pending' | 'signed' | 'rejected';
export type BidStatus = 'open' | 'accepted' | 'rejected';
export type InvoiceStatus = 'due' | 'paid' | 'overdue';
export type WalletTxnType = 'credit' | 'debit';

/** Which pricing badge to render on detail/rows. */
export type PriceBadge = 'Contract' | 'Spot' | 'Amended';

/** Ordered lifecycle used to compute timeline progress. */
export const SHIPMENT_LIFECYCLE: readonly ShipmentStatus[] = [
  'posted',
  'accepted',
  'driver_accepted',
  'at_pickup',
  'loaded',
  'in_transit',
  'arrived',
  'delivered',
  'completed',
] as const;
