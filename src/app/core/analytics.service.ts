import { Injectable } from '@angular/core';

/**
 * Analytics seam (requirements §9 — tag events `shipper_web`). Stub today;
 * swap the sink for Amplitude/real transport later without touching callers.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  track(event: string, props: Record<string, unknown> = {}): void {
    // TODO: forward to the real analytics transport.
    if (typeof console !== 'undefined') {
      console.debug('[shipper_web]', event, props);
    }
  }
}
