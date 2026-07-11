import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Avatar, Icon } from '../../shared/ui';
import { BranchesStore } from './branches.store';

/** Full-page branch detail — location, manager, status & actions. */
@Component({
  selector: 'app-branch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Avatar],
  templateUrl: './branch.html',
  styleUrl: './branch.scss',
})
export class Branch {
  readonly id = input.required<string>();

  protected readonly store = inject(BranchesStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly branch = computed(() => this.store.byId(this.id()) ?? null);

  protected toggleActive(): void {
    const b = this.branch();
    if (!b) return;
    const active = b.status !== 'active';
    this.store.setActive(b.id, active);
    this.toast.show(`${b.name} ${active ? 'activated' : 'deactivated'}`);
  }
  protected setPrimary(): void {
    const b = this.branch();
    if (!b) return;
    this.store.setPrimary(b.id);
    this.toast.show(`${b.name} is now your primary branch`, 'success');
  }
  protected remove(): void {
    const b = this.branch();
    if (!b) return;
    this.store.remove(b.id);
    this.toast.show(`${b.name} removed`);
    this.router.navigate(['/settings/branches']);
  }
}
