import { Shipment } from '../../models';
import { IconName } from '../../shared/ui';

export type Direction = 'inbound' | 'outbound';
export type DirFilter = 'all' | Direction;

/**
 * Shipment direction — inbound (supplier → your warehouse) or outbound
 * (your warehouse → customer). Derived deterministically for now; when real
 * data carries a direction field, swap this for that.
 */
export function shipmentDirection(s: Shipment): Direction {
  let h = 0;
  for (let i = 0; i < s.id.length; i++) h = (h * 31 + s.id.charCodeAt(i)) >>> 0;
  return h % 2 === 0 ? 'inbound' : 'outbound';
}

export function directionView(d: Direction): { label: string; short: string; icon: IconName; tone: 'sky' | 'gold' } {
  return d === 'inbound'
    ? { label: 'Inbound', short: 'In', icon: 'download', tone: 'sky' }
    : { label: 'Outbound', short: 'Out', icon: 'upload', tone: 'gold' };
}
