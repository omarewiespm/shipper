import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui';
import { IntegrationLogo } from './integration-logo';
import { categoryLabel, CATEGORIES, formatInstalls, IntCategory, Integration, IntegrationsStore } from './integrations.store';

const CAT_KEYS = new Set(['all', 'installed', ...CATEGORIES.map((c) => c.key)]);

/** Integrations — an app-store of AVL, ERP, accounting & government connectors. */
@Component({
  selector: 'app-integrations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, IntegrationLogo],
  templateUrl: './integrations.html',
  styleUrl: './integrations.scss',
})
export class Integrations {
  protected readonly store = inject(IntegrationsStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly categories = CATEGORIES;

  constructor() {
    // Deep-link support: /integrations?category=erp opens that category.
    const cat = inject(ActivatedRoute).snapshot.queryParamMap.get('category');
    if (cat && CAT_KEYS.has(cat)) this.store.category.set(cat as IntCategory | 'all' | 'installed');
  }

  protected readonly chips = computed(() => {
    const counts = this.store.countByCategory();
    return [
      { key: 'all' as const, label: 'All apps', count: counts['all'] ?? 0 },
      ...CATEGORIES.map((c) => ({ key: c.key, label: c.label, count: counts[c.key] ?? 0 })),
      { key: 'installed' as const, label: 'Installed', count: this.store.installedCount() },
    ];
  });

  protected catLabel(c: IntCategory): string { return categoryLabel(c); }
  protected installs(n: number): string { return formatInstalls(n); }

  protected openDetail(app: Integration): void { this.router.navigate(['/integrations', app.id]); }

  protected connect(app: Integration, event: Event): void {
    event.stopPropagation();
    this.store.setConnected(app.id, true);
    this.toast.show(`Connected to ${app.name}`, 'success');
  }
  protected disconnect(app: Integration, event: Event): void {
    event.stopPropagation();
    this.store.setConnected(app.id, false);
    this.toast.show(`Disconnected ${app.name}`);
  }
}

