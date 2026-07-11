import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics.service';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui';

/** Bulk upload — all rows land as drafts (spec §9). */
@Component({
  selector: 'app-create-bulk',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  template: `
    <a class="cb__back" routerLink="/shipments/create"><app-icon name="arrow-left" [size]="15" /> Create shipment</a>
    <h1 class="cb__title">Bulk upload</h1>

    <div class="cb">
      <div class="cb__main">
        <div class="cb__template">
          <span class="cb__ttile"><app-icon name="download" [size]="18" /></span>
          <div class="cb__tbody">
            <p class="cb__tt">Shipment template</p>
            <p class="cb__td">Download, fill one row per shipment, then upload.</p>
          </div>
          <button class="cb__tbtn" type="button" (click)="toast.show('Template downloaded')">Template</button>
        </div>

        <div class="cb__drop" [class.is-drag]="dragging()"
          (dragover)="$event.preventDefault(); dragging.set(true)"
          (dragleave)="dragging.set(false)"
          (drop)="onDrop($event)">
          <span class="cb__droptile"><app-icon name="upload" [size]="24" /></span>
          <p class="cb__dropt">Drop your file here or browse</p>
          <p class="cb__drops">CSV or Excel · up to 500 shipments per upload</p>
          <button class="cb__choose" type="button" (click)="upload()">Choose file</button>
        </div>
      </div>

      <aside class="cb__side">
        <p class="cb__sh">How it works</p>
        <ol class="cb__steps">
          @for (s of steps; track s.n) {
            <li class="cb__step">
              <span class="cb__num">{{ s.n }}</span>
              <div><p class="cb__st">{{ s.t }}</p><p class="cb__ss">{{ s.d }}</p></div>
            </li>
          }
        </ol>
        <div class="cb__note">
          <app-icon name="info" [size]="16" />
          <span>Uploads are saved as <strong>drafts</strong> in the Shipments tab. A reviewer confirms them, then publishes — nothing goes live automatically.</span>
        </div>
      </aside>
    </div>
  `,
  styleUrl: './create-bulk.scss',
})
export class CreateBulk {
  protected readonly toast = inject(ToastService);
  private readonly analytics = inject(AnalyticsService);
  protected readonly dragging = signal(false);

  protected readonly steps = [
    { n: 1, t: 'Upload', d: 'Add your CSV or Excel file.' },
    { n: 2, t: 'Review as drafts', d: 'Fix any flagged rows in the Drafts tab.' },
    { n: 3, t: 'Publish', d: 'A reviewer confirms, then dispatches.' },
  ];

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    this.upload();
  }
  protected upload(): void {
    this.analytics.track('bulk_uploaded', { rows: 0, invalidRows: 0 });
    this.toast.show('Uploaded — rows saved as drafts');
  }
}
