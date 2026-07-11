import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui';
import { IntegrationLogo } from './integration-logo';
import { categoryLabel, formatInstalls, Integration, IntegrationsStore } from './integrations.store';

type Tab = 'details' | 'install' | 'scope' | 'reviews';

/** Full-page integration detail — app screens + tabs (details / install / scope / reviews). */
@Component({
  selector: 'app-integration-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, IntegrationLogo],
  templateUrl: './integration-detail.html',
  styleUrl: './integration-detail.scss',
})
export class IntegrationDetail {
  readonly id = input.required<string>();

  protected readonly store = inject(IntegrationsStore);
  private readonly toast = inject(ToastService);

  protected readonly tab = signal<Tab>('details');
  protected readonly tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Details' },
    { key: 'install', label: 'How to install' },
    { key: 'scope', label: 'Scope' },
    { key: 'reviews', label: 'Reviews' },
  ];
  protected readonly screens = [
    { title: 'Live dashboard', kind: 'chart' },
    { title: 'Shipment sync', kind: 'list' },
    { title: 'Field mapping', kind: 'form' },
    { title: 'Reports & export', kind: 'grid' },
  ];
  protected readonly starArray = [1, 2, 3, 4, 5];

  private readonly strip = viewChild<ElementRef<HTMLElement>>('strip');
  protected scrollScreens(dir: -1 | 1): void {
    const el = this.strip()?.nativeElement;
    if (el) el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' });
  }

  protected readonly app = computed(() => this.store.byId(this.id()) ?? null);
  protected readonly detail = computed(() => { const a = this.app(); return a ? this.store.detail(a) : null; });
  protected readonly reviews = computed(() => { const a = this.app(); return a ? this.store.reviews(a) : []; });
  protected readonly installsLabel = computed(() => formatInstalls(this.app()?.installs ?? 0));
  protected readonly ratingsCount = computed(() => {
    const a = this.app();
    return a ? Math.max(24, Math.round(a.installs * 0.14)) : 0;
  });

  protected catLabel(a: Integration): string { return categoryLabel(a.category); }
  protected filled(i: number): boolean { return i <= Math.round(this.app()?.rating ?? 0); }

  protected connect(): void {
    const a = this.app();
    if (!a) return;
    this.store.setConnected(a.id, true);
    this.toast.show(`Connected to ${a.name}`, 'success');
  }
  protected disconnect(): void {
    const a = this.app();
    if (!a) return;
    this.store.setConnected(a.id, false);
    this.toast.show(`Disconnected ${a.name}`);
  }
  protected playVideo(): void { this.toast.show('Playing walkthrough…'); }
}
