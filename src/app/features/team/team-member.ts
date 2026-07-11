import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Avatar, Icon } from '../../shared/ui';
import { Role, TeamStore } from './team.store';

/** Full-page team member detail — profile, role & access, approve / remove. */
@Component({
  selector: 'app-team-member',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Avatar],
  templateUrl: './team-member.html',
  styleUrl: './team-member.scss',
})
export class TeamMember {
  readonly id = input.required<string>();

  protected readonly store = inject(TeamStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly assignableRoles = this.store.assignableRoles;
  protected readonly member = computed(() => this.store.byId(this.id()) ?? null);
  protected readonly editRole = signal<Role>('procurement');

  constructor() {
    // Keep the editable role in sync with the loaded member.
    effect(() => {
      const m = this.member();
      if (m) untracked(() => this.editRole.set(m.role));
    });
  }

  protected roleMeta(role: Role) { return this.store.roleMeta(role); }
  protected readonly dirty = computed(() => { const m = this.member(); return !!m && m.role !== this.editRole(); });

  protected saveRole(): void {
    const m = this.member();
    if (!m) return;
    this.store.setRole(m.id, this.editRole());
    this.toast.show(`${m.name} is now ${this.roleMeta(this.editRole()).label}`, 'success');
  }
  protected approve(): void {
    const m = this.member();
    if (!m) return;
    this.store.approve(m.id);
    this.toast.show(`${m.name} approved — they now have access`, 'success');
  }
  protected remove(): void {
    const m = this.member();
    if (!m) return;
    this.store.remove(m.id);
    this.toast.show(`${m.name} removed`);
    this.router.navigate(['/settings/users']);
  }
  protected resend(): void {
    const m = this.member();
    if (m) this.toast.show(`Invitation re-sent to ${m.email}`);
  }
}
