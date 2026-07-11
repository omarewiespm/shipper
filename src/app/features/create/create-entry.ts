import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics.service';
import { ToastService } from '../../core/toast.service';
import { Icon, IconName } from '../../shared/ui';
import { CreateAiDrawer } from './create-ai-drawer';

interface AiAction { label: string; icon: IconName; q: string }

/** Entry choice: single · bulk · AI (spec §2.1 + AI create). */
@Component({
  selector: 'app-create-entry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, CreateAiDrawer],
  template: `
    <div class="ce">
      <h1 class="ce__title">Create a shipment</h1>
      <p class="ce__sub">Pick how you'd like to create it — you can switch anytime.</p>

      <div class="ce__grid">
        <a class="ce__card" routerLink="/shipments/create/single" (click)="track('single')">
          <span class="ce__tile ce__tile--navy"><app-icon name="plus" [size]="26" /></span>
          <h2 class="ce__ct">Create one shipment</h2>
          <p class="ce__cd">A quick form with your price shown instantly.</p>
          <span class="ce__go">Start <app-icon name="arrow-right" [size]="16" /></span>
        </a>
        <a class="ce__card" routerLink="/shipments/create/bulk" (click)="track('bulk')">
          <span class="ce__tile ce__tile--sky"><app-icon name="upload" [size]="26" /></span>
          <h2 class="ce__ct">Bulk upload</h2>
          <p class="ce__cd">Upload many at once from a file.</p>
          <span class="ce__go">Upload file <app-icon name="arrow-right" [size]="16" /></span>
        </a>
      </div>

      <!-- Create with Madar AI -->
      <div class="ai" [class.is-open]="open()">
        <span class="ai__aura" aria-hidden="true"></span>
        <div class="ai__lead">
          <span class="ai__spark"><app-icon name="sparkles" [size]="18" /></span>
          <div>
            <p class="ai__t">Create with Madar AI</p>
            <p class="ai__s">Let the assistant set up your shipment for you.</p>
          </div>
        </div>

        <div class="ai__bar" role="button" tabindex="0" [attr.aria-expanded]="open()" aria-haspopup="menu"
          (click)="open.set(!open())" (keydown.enter)="open.set(!open())" (keydown.escape)="open.set(false)">
          <span class="ai__ph">Ask Madar AI…</span>
          <button class="ai__mic" type="button" aria-label="Voice (coming soon)" (click)="voice($event)"><app-icon name="mic" [size]="18" /></button>
          <span class="ai__send"><app-icon name="send" [size]="18" /></span>
        </div>

        @if (open()) {
          <div class="ai__backdrop" (click)="open.set(false)"></div>
          <div class="ai__menu" role="menu">
            @for (o of actions; track o.q; let i = $index) {
              <button class="ai__opt" type="button" role="menuitem" [style.animation-delay.ms]="i * 40" (click)="select(o)">
                <span class="ai__opticon"><app-icon [name]="o.icon" [size]="16" /></span>
                <span class="ai__optlabel">{{ o.label }}</span>
                <app-icon name="arrow-right" [size]="15" class="ai__optgo" />
              </button>
            }
          </div>
        }
      </div>

      <app-create-ai-drawer [open]="aiOpen()" [seed]="aiSeed()" (closed)="aiOpen.set(false)" />
    </div>
  `,
  styleUrl: './create-entry.scss',
})
export class CreateEntry {
  private readonly analytics = inject(AnalyticsService);
  private readonly toast = inject(ToastService);
  protected readonly open = signal(false);

  // AI-create drawer state.
  protected readonly aiOpen = signal(false);
  protected readonly aiSeed = signal<string | null>(null);

  protected readonly actions: AiAction[] = [
    { label: 'Create a new shipment', icon: 'plus', q: 'I want to create a new shipment' },
    { label: 'Ship to a recent customer', icon: 'users', q: 'Ship to one of my recent customers' },
    { label: 'Repeat a past shipment', icon: 'copy', q: 'Repeat one of my recent shipments' },
    { label: 'Plan a multi-stop trip', icon: 'map-pin', q: 'Create a shipment with several drop-offs' },
  ];

  protected track(path: 'single' | 'bulk'): void {
    this.analytics.track('create_entry_path_chosen', { path });
  }
  protected select(o: AiAction): void {
    this.analytics.track('create_entry_path_chosen', { path: 'ai', action: o.label });
    this.open.set(false);
    this.aiSeed.set(o.q);
    this.aiOpen.set(true);
  }
  protected voice(e: Event): void {
    e.stopPropagation();
    this.toast.show('Voice input coming soon');
  }
}
