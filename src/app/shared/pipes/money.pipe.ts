import { Pipe, PipeTransform } from '@angular/core';
import { Money } from '../../models';

/**
 * Formats Money as "SAR 3,200" (grouped, no decimals for whole amounts).
 * Pair with `.tabular` in tables for aligned figures.
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: Money | null | undefined): string {
    if (!value) return '—';
    const hasFraction = value.amount % 1 !== 0;
    const num = value.amount.toLocaleString('en-US', {
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2,
    });
    return `${value.currency} ${num}`;
  }
}
