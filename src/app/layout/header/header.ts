import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ToastService } from '../../core/toast.service';
import { WalletStore } from '../../features/payments/wallet.store';
import { Avatar, Icon } from '../../shared/ui';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { AppHub } from './app-hub/app-hub';
import { MenuStateService } from '../../core/menu-state.service';
import { SessionService } from '../../core/session.service';
import { OnboardingStore } from '../../features/home/onboarding.store';
import { UiStateStore } from '../ui-state.store';

const ACCOUNT_ID = 'account';

/** Route segment → contextual search placeholder (i18n-ready map). */
const SEARCH_SCOPES: Record<string, string> = {
  home: 'Search Madar',
  shipments: 'Search Shipments',
  partners: 'Search Partners',
  carriers: 'Search Carriers',
  tracking: 'Search tracking',
  payments: 'Search Payments',
  reports: 'Search Reports',
};

const ACCOUNT_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
];

/**
 * App-shell header (spec): global search (inline-start) + a pinned cluster
 * (inline-end) of app hub · wallet chip · profile avatar. Notifications live in
 * the sidebar utility strip, not here.
 */
@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Avatar, MoneyPipe, AppHub, CdkOverlayOrigin, CdkConnectedOverlay],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit {
  private readonly ui = inject(UiStateStore);
  private readonly menu = inject(MenuStateService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionService);
  private readonly onboarding = inject(OnboardingStore);
  protected readonly wallet = inject(WalletStore);

  protected readonly company = 'Rawabi Trading Co.';
  protected readonly accountPositions = ACCOUNT_POSITIONS;

  /** Contextual search placeholder, driven by the active route's first segment. */
  private readonly url = signal(this.router.url);
  protected readonly searchPlaceholder = computed(() => {
    const seg = this.url().split('?')[0].split('/').filter(Boolean)[0] ?? '';
    return SEARCH_SCOPES[seg] ?? 'Search';
  });

  private readonly accountTrigger = viewChild.required<ElementRef<HTMLButtonElement>>('accountTrigger');

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe((e) => this.url.set(e.urlAfterRedirects));
  }

  ngOnInit(): void {
    this.wallet.load();
  }

  protected openMobileNav(): void {
    this.ui.toggleMobileNav(true);
  }

  protected openWallet(): void {
    this.router.navigateByUrl('/payments/wallet');
  }

  // --- Account menu --------------------------------------------------------
  protected isAccountOpen(): boolean {
    return this.menu.isOpen(ACCOUNT_ID);
  }
  protected toggleAccount(): void {
    this.menu.toggle(ACCOUNT_ID);
  }
  protected closeAccount(): void {
    this.menu.close(ACCOUNT_ID);
    this.accountTrigger().nativeElement.focus();
  }
  protected onAccountKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeAccount();
    }
  }
  protected go(route: string): void {
    this.closeAccount();
    this.router.navigateByUrl(route);
  }
  protected signOut(): void {
    this.closeAccount();
    this.session.signOut();
    this.onboarding.reset();
    this.router.navigate(['/auth']);
    this.toast.show('Signed out');
  }
}
