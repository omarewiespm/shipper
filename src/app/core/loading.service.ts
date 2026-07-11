import { computed, Injectable, signal } from '@angular/core';

/**
 * Global in-flight request counter, fed by the loading interceptor.
 * Screens prefer local skeletons; this is for a top-level progress affordance.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly inflight = signal(0);

  readonly isLoading = computed(() => this.inflight() > 0);

  start(): void {
    this.inflight.update((n) => n + 1);
  }

  stop(): void {
    this.inflight.update((n) => Math.max(0, n - 1));
  }
}
