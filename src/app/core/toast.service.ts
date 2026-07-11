import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  variant: 'default' | 'success' | 'error';
}

/** Brief bottom-inline-end toasts (UI spec §3.11). Auto-dismiss 2.2s. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  show(text: string, variant: Toast['variant'] = 'default'): void {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, text, variant }]);
    setTimeout(() => this.dismiss(id), 2200);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
