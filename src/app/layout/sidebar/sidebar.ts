import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AiChatService } from '../../features/ai/ai-chat.service';
import { SidePanelService } from '../../features/ai/side-panel.service';
import { CreateDrawerService } from '../../features/create/create-drawer.service';
import { ShipmentsStore } from '../../features/shipments/shipments.store';
import { Badge, Icon, TooltipDirective } from '../../shared/ui';
import { CREATE_NAV, NavItem, PRIMARY_NAV, SECONDARY_NAV } from '../nav.config';
import { UiStateStore } from '../ui-state.store';

/**
 * Three-zone light sidebar:
 *   1. Navigation (flex-grow, scrolls) — destinations only.
 *   2. Utility strip (pinned) — notifications, messages, support, Madar AI.
 *   3. Create shipment (pinned bottom) — a quiet full-width pill, not a nav row.
 * Active nav = soft navy pill + navy 600 + 3px orange inline-start marker.
 * Orange is limited to: logo mark, active marker, and count badges.
 */
@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon, Badge, TooltipDirective],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly ui = inject(UiStateStore);
  private readonly router = inject(Router);
  private readonly shipments = inject(ShipmentsStore);
  private readonly aiChat = inject(AiChatService);
  private readonly panel = inject(SidePanelService);
  private readonly createDrawer = inject(CreateDrawerService);

  protected readonly createNav = CREATE_NAV;
  protected readonly primaryNav = PRIMARY_NAV;
  protected readonly secondaryNav = SECONDARY_NAV;

  /** Collapsible groups start collapsed; a group auto-opens when on its child. */
  protected readonly openGroups = signal<Set<string>>(new Set());
  /** Current URL — drives the subtle "parent active" tint. */
  private readonly url = signal(this.router.url);

  constructor() {
    this.syncOpenGroups(this.router.url);
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe((e) => { this.url.set(e.urlAfterRedirects); this.syncOpenGroups(e.urlAfterRedirects); });
  }

  /** True when one of the group's children is the active route. */
  protected isParentActive(item: NavItem): boolean {
    return (item.children ?? []).some((c) => this.url().startsWith(c.route));
  }

  private syncOpenGroups(url: string): void {
    const groups = [...this.primaryNav, ...this.secondaryNav].filter((i) => i.children);
    const toOpen = groups
      .filter((g) => g.children!.some((c) => url.startsWith(c.route)))
      .map((g) => g.label);
    if (toOpen.length) {
      this.openGroups.update((s) => { const n = new Set(s); toOpen.forEach((l) => n.add(l)); return n; });
    }
  }

  protected readonly badges = computed<Record<string, number>>(() => ({
    shipments: this.shipments.attentionCount(),
  }));

  // Utility-strip signals (stubbed until their features land).
  protected readonly notificationsUnread = signal(true);
  protected readonly messagesUnread = signal(0);

  protected readonly notificationsLabel = computed(() =>
    this.notificationsUnread() ? 'Notifications, unread' : 'Notifications',
  );
  protected readonly messagesLabel = computed(() =>
    this.messagesUnread() ? `Messages, ${this.messagesUnread()} unread` : 'Messages',
  );

  protected isGroupOpen(label: string): boolean {
    return this.openGroups().has(label);
  }

  protected toggleGroup(label: string): void {
    this.openGroups.update((set) => {
      const next = new Set(set);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  protected badgeFor(key?: string): number {
    return key ? (this.badges()[key] ?? 0) : 0;
  }

  protected closeMobile(): void {
    this.ui.toggleMobileNav(false);
  }

  protected openCreate(): void {
    this.closeMobile();
    this.createDrawer.open();
  }

  // --- Utility strip actions ------------------------------------------------
  // Only one side drawer is open at a time: opening a utility panel closes the
  // AI chat drawer, and opening the AI chat closes any utility panel.
  protected openNotifications(): void {
    this.notificationsUnread.set(false);
    this.aiChat.close();
    this.panel.open('notifications');
    this.closeMobile();
  }
  protected openMessages(): void {
    this.messagesUnread.set(0);
    this.aiChat.close();
    this.panel.open('messages');
    this.closeMobile();
  }
  protected openSupport(): void {
    this.aiChat.close();
    this.panel.open('support');
    this.closeMobile();
  }
  protected openMadarAi(): void {
    this.panel.close();
    this.closeMobile();
    this.aiChat.open();
  }
}
