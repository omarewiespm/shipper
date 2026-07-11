/* =============================================================================
   Domain invariants — requirements §7 ("enforce in code").
   Pure, dependency-free predicates so any layer can guard on them.
   ============================================================================= */

import { Contract, PriceAmendment, Shipment } from './entities';
import { PriceBadge, SHIPMENT_LIFECYCLE, ShipmentStatus } from './enums';

/**
 * A shipment priced by a signed amendment cannot dispatch until that amendment
 * is signed AND Nafath-verified.
 */
export function canDispatch(
  shipment: Shipment,
  amendment?: PriceAmendment,
): boolean {
  if (shipment.priceModel !== 'signed_amendment') {
    return true;
  }
  return (
    !!amendment &&
    amendment.status === 'signed' &&
    !!amendment.signature?.nafathVerified
  );
}

/** An amendment is only valid if signed by the contract's authorized signatory. */
export function isAmendmentSignatoryValid(
  amendment: PriceAmendment,
  contract: Contract,
): boolean {
  if (amendment.status !== 'signed') {
    return false;
  }
  return amendment.signature?.signedBy === contract.authorizedSignatory.userId;
}

/** True while a shipment is blocked awaiting an amendment signature. */
export function isAwaitingSignatureLock(
  shipment: Shipment,
  amendment?: PriceAmendment,
): boolean {
  return (
    shipment.priceModel === 'signed_amendment' &&
    !canDispatch(shipment, amendment)
  );
}

/** Map the price model to its detail/row badge label. */
export function priceBadge(shipment: Shipment): PriceBadge {
  switch (shipment.priceModel) {
    case 'contract':
      return 'Contract';
    case 'accepted_bid':
      return 'Spot';
    case 'signed_amendment':
      return 'Amended';
  }
}

/** 0..1 progress along the happy-path lifecycle (terminal states clamp to ends). */
export function lifecycleProgress(status: ShipmentStatus): number {
  if (status === 'draft') return 0;
  if (status === 'cancelled' || status === 'rejected' || status === 'not_fulfilled') {
    return 0;
  }
  const idx = SHIPMENT_LIFECYCLE.indexOf(status);
  if (idx < 0) return 0;
  return idx / (SHIPMENT_LIFECYCLE.length - 1);
}
