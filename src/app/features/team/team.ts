import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Avatar, Icon } from '../../shared/ui';
import { TeamActionsMenu } from './team-actions-menu';
import { Member, Role, TeamStore } from './team.store';

const PAGE_SIZE = 8;

/** Team — manage who has access to your Madar account and what they can do. */
@Component({
  selector: 'app-team',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon, Avatar, TeamActionsMenu],
  templateUrl: './team.html',
  styleUrl: './team.scss',
})
export class Team {
  protected readonly store = inject(TeamStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly assignableRoles = this.store.assignableRoles;

  // Pagination
  protected readonly page = signal(1);
  protected readonly total = computed(() => this.store.members().length);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.pageCount() }, (_, i) => i + 1));
  protected readonly paged = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.store.members().slice(start, start + PAGE_SIZE);
  });
  protected readonly showingFrom = computed(() => (this.total() ? (this.page() - 1) * PAGE_SIZE + 1 : 0));
  protected readonly showingTo = computed(() => Math.min(this.page() * PAGE_SIZE, this.total()));
  protected goToPage(n: number): void { if (n >= 1 && n <= this.pageCount()) this.page.set(n); }

  protected view(m: Member): void { this.router.navigate(['/settings/users', m.id]); }
  protected approve(m: Member): void { this.store.approve(m.id); this.toast.show(`${m.name} approved — they now have access`, 'success'); }
  protected resend(m: Member): void { this.toast.show(`Invitation re-sent to ${m.email}`); }

  // Invite drawer
  protected readonly inviteOpen = signal(false);
  protected readonly iName = signal('');
  protected readonly iEmail = signal('');
  protected readonly iMobile = signal('');
  protected readonly iRole = signal<Role>('procurement');
  protected readonly canInvite = computed(() => this.iName().trim().length > 1 && /.+@.+\..+/.test(this.iEmail().trim()));
  protected openInvite(): void {
    this.iName.set(''); this.iEmail.set(''); this.iMobile.set(''); this.iRole.set('procurement');
    this.inviteOpen.set(true);
  }
  protected sendInvite(): void {
    if (!this.canInvite()) return;
    this.store.invite({ name: this.iName(), email: this.iEmail(), mobile: this.iMobile(), role: this.iRole() });
    this.inviteOpen.set(false);
    this.toast.show(`Invitation sent to ${this.iEmail().trim()}`, 'success');
  }
}
