import { computed, inject, Injectable, signal } from '@angular/core';
import { AnalyticsService } from '../../core/analytics.service';
import { SessionService } from '../../core/session.service';
import { StorageService } from '../../core/storage.service';
import { IconName } from '../../shared/ui';

export interface OnboardingState {
  accountCreated: true;
  businessVerified: boolean;
  hasReceiver: boolean;
  hasShipment: boolean;
  hasTeamMember: boolean;
}

export interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  icon: IconName;
  route: string | null;
  done: boolean;
}

/** The five getting-started tasks (progress starts at 0, hidden at 5). */
const CHECKLIST_KEYS = ['verify', 'partner', 'shipment', 'team', 'integration'] as const;

const COLLAPSED_KEY = 'madar.onboarding.collapsed';

/**
 * Single source of truth for the Home onboarding layer (spec Part Two §0/§4).
 * All three sections are views of this one state; verifying business updates the
 * banner and checklist item together.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingStore {
  private readonly session = inject(SessionService);
  private readonly storage = inject(StorageService);
  private readonly analytics = inject(AnalyticsService);

  private readonly state = signal<OnboardingState | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);

  readonly firstName = computed(() => this.session.displayName());

  readonly businessVerified = computed(() => this.state()?.businessVerified ?? true);

  /** Getting-started progress — starts empty (0 of 5); the section hides at 5. */
  private readonly stepsDone = signal<Set<string>>(new Set());
  readonly completedSteps = computed(() => this.stepsDone().size);
  readonly gettingStartedDone = computed(() => this.completedSteps() >= CHECKLIST_KEYS.length);

  completeStep(key: string): void {
    if (!CHECKLIST_KEYS.includes(key as (typeof CHECKLIST_KEYS)[number])) return;
    this.stepsDone.update((s) => { const n = new Set(s); n.add(key); return n; });
    this.analytics.track('onboarding_step_completed', { step: key });
    if (this.gettingStartedDone()) this.analytics.track('onboarding_completed', {});
  }
  readonly isFirstRun = computed(() => !!this.state() && !this.state()!.hasShipment);
  readonly onboardingComplete = computed(() => {
    const s = this.state();
    return !!s && s.businessVerified && s.hasReceiver && s.hasShipment && s.hasTeamMember;
  });
  readonly showChecklist = computed(() => !!this.state() && !this.onboardingComplete());
  readonly showVerifyBanner = computed(() => !!this.state() && !this.businessVerified());

  readonly checklist = computed<ChecklistItem[]>(() => {
    const has = (k: string) => this.stepsDone().has(k);
    return [
      { key: 'verify', title: 'Verify your business', description: 'Confirm CR and VAT details', icon: 'shield', route: '/settings/company', done: has('verify') },
      { key: 'partner', title: 'Add your first partner', description: 'A customer you ship to or a supplier', icon: 'network', route: '/partners', done: has('partner') },
      { key: 'shipment', title: 'Create your first shipment', description: 'Ship your first load with Madar', icon: 'package', route: '/shipments/create', done: has('shipment') },
      { key: 'team', title: 'Invite your team', description: 'Add colleagues to your account', icon: 'users', route: '/settings/team', done: has('team') },
      { key: 'integration', title: 'Connect an integration', description: 'Sync from your ERP, AVL or accounting', icon: 'integrations', route: '/integrations', done: has('integration') },
    ];
  });

  readonly collapsed = signal(this.storage.get<boolean>(COLLAPSED_KEY, true));

  load(): void {
    // Initialise once per session so a completed action (e.g. verifying the
    // business) is not undone when Home re-mounts. `reset()` clears it on logout.
    if (this.state()) return;
    // Mock: a fresh signup starts empty; returning users are steady-state.
    if (this.session.firstRun()) {
      this.state.set({ accountCreated: true, businessVerified: false, hasReceiver: false, hasShipment: false, hasTeamMember: false });
      this.analytics.track('onboarding_banner_shown', {});
    } else {
      this.state.set({ accountCreated: true, businessVerified: true, hasReceiver: true, hasShipment: true, hasTeamMember: true });
    }
  }

  /** Clear onboarding state on sign-out so the next sign-in starts fresh. */
  reset(): void {
    this.state.set(null);
    this.stepsDone.set(new Set());
    this.failed.set(false);
  }

  verifyBusiness(): void {
    this.analytics.track('business_verified', {});
    this.state.update((s) => (s ? { ...s, businessVerified: true } : s));
    this.emitStep('businessVerified');
  }

  // Demo hooks — real flows flip these as a side effect elsewhere.
  markReceiver(): void { this.state.update((s) => (s ? { ...s, hasReceiver: true } : s)); this.emitStep('hasReceiver'); }
  markShipment(): void { this.state.update((s) => (s ? { ...s, hasShipment: true } : s)); this.emitStep('hasShipment'); }
  markTeam(): void { this.state.update((s) => (s ? { ...s, hasTeamMember: true } : s)); this.emitStep('hasTeamMember'); }

  toggleCollapsed(): void {
    this.collapsed.update((v) => !v);
    this.storage.set(COLLAPSED_KEY, this.collapsed());
    this.analytics.track(this.collapsed() ? 'onboarding_checklist_collapsed' : 'onboarding_checklist_expanded', {});
  }

  private emitStep(step: string): void {
    this.analytics.track('onboarding_step_completed', { step });
    if (this.onboardingComplete()) this.analytics.track('onboarding_completed', {});
  }
}
