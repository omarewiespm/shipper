import { Shipment } from '../../models';
import { shipmentChipView } from '../../shared/ui';

/** CSV export for the Shipments screen (spec §5). All fields, filtered set. */

const HEADERS = [
  'Shipment ID',
  'Receiver',
  'From (city)',
  'From (address)',
  'To (city)',
  'To (address)',
  'Created',
  'Status',
];

function escape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatCreated(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function shipmentsToCsv(
  shipments: Shipment[],
  receiverName: (id: string) => string,
): string {
  const lines = [HEADERS.join(',')];
  for (const s of shipments) {
    lines.push(
      [
        s.id,
        receiverName(s.receiverId),
        s.origin.city,
        s.origin.line,
        s.destination.city,
        s.destination.line,
        formatCreated(s.createdAt),
        shipmentChipView(s.status).label,
      ]
        .map((v) => escape(String(v)))
        .join(','),
    );
  }
  return lines.join('\r\n');
}

/** Triggers a client-side download. UTF-8 with BOM so Excel renders Arabic. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
