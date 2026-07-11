import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Icon, IconName } from '../../shared/ui';
import { SidePanelService } from './side-panel.service';

interface NotifItem { icon: IconName; tone: string; text: string; time: string; route: string }
interface HelpItem { icon: IconName; title: string; sub: string }
interface NewsItem { icon: IconName; tag: string; title: string; body: string; date: string }

/** Notifications · Messages · Support drawers (spec §sidebar utility strip). */
@Component({
  selector: 'app-utility-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon],
  templateUrl: './utility-panel.html',
  styleUrl: './utility-panel.scss',
})
export class UtilityPanel {
  protected readonly svc = inject(SidePanelService);
  private readonly router = inject(Router);

  /** Messages has its own drawer component; this panel handles the rest. */
  protected readonly panel = computed(() => {
    const a = this.svc.active();
    return a === 'messages' ? null : a;
  });

  protected readonly notifications: NotifItem[] = [
    { icon: 'truck', tone: 'info', text: 'SH-2042 is in transit — Jeddah → Riyadh.', time: '12m ago', route: '/shipments/SH-2042' },
    { icon: 'file-check', tone: 'warn', text: 'Delivery note pending for SH-2037.', time: '1h ago', route: '/shipments' },
    { icon: 'percent', tone: 'info', text: 'A price change needs your approval.', time: '3h ago', route: '/signing' },
    { icon: 'receipt', tone: 'neutral', text: 'Invoice INV-5503 is overdue.', time: 'Yesterday', route: '/payments' },
  ];
  protected readonly help: HelpItem[] = [
    { icon: 'package', title: 'Creating & tracking shipments', sub: 'Post, price, and follow a load' },
    { icon: 'receipt', title: 'Payments & invoices', sub: 'Pay, wallet, and statements' },
    { icon: 'shield', title: 'Business verification', sub: 'CR & VAT with Elm' },
  ];

  /** Notifications drawer sub-tab: account activity vs. product updates. */
  protected readonly notifTab = signal<'account' | 'news'>('account');
  protected readonly whatsNew: NewsItem[] = [
    { icon: 'navigation', tag: 'New', title: 'Live tracking on a real map', body: 'Follow every truck on the map, chat with the fleet, and see ETA & distance live.', date: 'Jul 8' },
    { icon: 'sparkles', tag: 'New', title: 'Create shipments with Madar AI', body: 'Describe a shipment in plain language and let the assistant set it up for you.', date: 'Jul 2' },
    { icon: 'gauge', tag: 'Improved', title: 'Faster instant pricing', body: 'Your contract price now appears the moment you pick a route and vehicle.', date: 'Jun 24' },
  ];

  constructor() {
    // Default to the Account tab each time the notifications drawer opens.
    effect(() => {
      if (this.svc.active() === 'notifications') this.notifTab.set('account');
    });
  }

  protected go(route: string): void {
    this.svc.close();
    this.router.navigateByUrl(route);
  }
}
