import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService } from '../../../core/analytics.service';
import { CreateDrawerService } from '../../create/create-drawer.service';
import { Icon } from '../../../shared/ui';

/** Three ways to create a first shipment (spec Part Two §2). First-run only. */
@Component({
  selector: 'app-first-shipment-paths',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <section class="fsp" aria-labelledby="fsp-title">
      <h2 class="fsp__title" id="fsp-title">Create Your Shipment</h2>
      <p class="fsp__sub">It's simpler than you think — pick the way that suits you.</p>

      <div class="fsp__grid">
        <button class="path" type="button" (click)="go('single')">
          <span class="path__tile path__tile--navy"><app-icon name="plus" [size]="22" [stroke]="1.7" /></span>
          <span class="path__t">Single shipment</span>
          <span class="path__d">Perfect for one-off deliveries. See your contract price instantly.</span>
          <span class="path__meta"><app-icon name="clock" [size]="12" /> 2–3 minutes</span>
        </button>

        <button class="path" type="button" (click)="go('bulk')">
          <span class="path__tile path__tile--sky"><app-icon name="upload" [size]="22" [stroke]="1.7" /></span>
          <span class="path__t">Bulk upload</span>
          <span class="path__d">Upload many shipments via CSV. They land as drafts for review.</span>
          <span class="path__meta"><app-icon name="clock" [size]="12" /> 5–10 minutes</span>
        </button>

        <button class="path" type="button" (click)="goErp()">
          <span class="path__tile path__tile--navy"><app-icon name="link" [size]="22" [stroke]="1.7" /></span>
          <span class="path__t">ERP integration</span>
          <span class="path__d">Sync shipments straight from Odoo, SAP, or NetSuite.</span>
          <span class="path__meta"><app-icon name="arrow-right" [size]="12" /> Browse ERP apps</span>
        </button>
      </div>
    </section>
  `,
  styleUrl: './first-shipment-paths.scss',
})
export class FirstShipmentPaths {
  private readonly createDrawer = inject(CreateDrawerService);
  private readonly analytics = inject(AnalyticsService);
  private readonly router = inject(Router);

  protected go(path: 'single' | 'bulk'): void {
    this.analytics.track('first_shipment_path_clicked', { path });
    this.createDrawer.open(path === 'bulk' ? 'bulk' : 'create');
  }
  protected goErp(): void {
    this.analytics.track('first_shipment_path_clicked', { path: 'erp' });
    this.router.navigate(['/integrations'], { queryParams: { category: 'erp' } });
  }
}
