/* =============================================================================
   Domain entities — requirements §7. Fields indicative; align to real API later.
   ============================================================================= */

import {
  AmendmentStatus,
  BidStatus,
  CapacitySource,
  CarrierKind,
  CarrierStatus,
  DocumentType,
  InvoiceStatus,
  PriceModel,
  ShipmentStatus,
  WalletTxnType,
} from './enums';

export interface Money {
  amount: number;
  currency: 'SAR';
}

export interface Address {
  id: string;
  label?: string;
  line: string;
  city: string;
  region?: string;
  lat?: number;
  lng?: number;
}

export interface Contact {
  name: string;
  phone?: string;
  email?: string;
}

export interface Lane {
  originCity: string;
  destinationCity: string;
}

export interface Cargo {
  type: string;
  weightKg: number;
}

export interface Driver {
  name: string;
  phone: string;
  plate: string;
  truck: string;
}

export interface TimelineEntry {
  status: ShipmentStatus;
  at: string;        // ISO timestamp
  note?: string;
}

export interface ShipmentDocument {
  id: string;
  shipmentId: string;
  type: DocumentType;
  url?: string;
  issuedAt?: string;
  signedAt?: string;
  signedBy?: string;
  /** Set when the document has been emailed to the shipper's official address. */
  emailedAt?: string;
}

export interface Shipment {
  id: string;                    // e.g. "SH-2042"
  receiverId: string;
  origin: Address;
  destination: Address;
  cargo: Cargo;
  truckType: string;
  status: ShipmentStatus;
  capacitySource: CapacitySource;
  priceModel: PriceModel;
  price: Money;
  carrierId?: string;
  driver?: Driver;
  documents: ShipmentDocument[];
  timeline: TimelineEntry[];
  etaAt?: string;
  createdAt: string;
  // Richer detail — optional; the detail view derives sensible values when absent.
  scheduledPickupAt?: string;
  requestedDeliveryAt?: string;
  optionalTruckType?: string;
  shipmentName?: string;
  createdBy?: string;
  notes?: string;
  poId?: string;
  productPrice?: Money; // internal-only; sourced from the linked PO
}

export interface Receiver {
  id: string;
  name: string;
  addresses: Address[];
  contacts: Contact[];
  defaultLane?: Lane;
  shipmentCount?: number;
}

export interface Carrier {
  id: string;
  name: string;
  type: CarrierKind;
  status: CarrierStatus;
  contacts: Contact[];
  rating?: number;
}

export interface RateRow {
  lane: Lane;
  truckType: string;
  price: Money;
}

export interface AuthorizedSignatory {
  name: string;
  role: string;
  userId: string;
}

export interface Contract {
  id: string;
  clientScope: string;
  rateTable: RateRow[];
  validFrom: string;
  validTo: string;
  authorizedSignatory: AuthorizedSignatory;
}

export interface Signature {
  provider: string;
  nafathVerified: boolean;
  signedBy: string;
  signedAt: string;
}

export interface PriceAmendment {
  id: string;
  shipmentId: string;
  contractId: string;
  oldPrice: Money;
  newPrice: Money;
  reason: string;
  status: AmendmentStatus;
  signature?: Signature;
}

export interface Bid {
  id: string;
  shipmentId: string;
  carrierId: string;
  amount: Money;
  status: BidStatus;
  submittedAt: string;
}

export interface Invoice {
  id: string;
  shipmentId: string;
  amount: Money;
  status: InvoiceStatus;
  attachments: ShipmentDocument[];
  dueDate: string;
}

export interface WalletTransaction {
  id: string;
  type: WalletTxnType;
  amount: Money;
  ref: string;
  at: string;
}
