import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Avatar, Icon } from '../../shared/ui';
import { BranchActionsMenu } from './branch-actions-menu';
import { Branch, BranchesStore } from './branches.store';

const PAGE_SIZE = 8;

/** Branches — your company's locations, their managers and status. */
@Component({
  selector: 'app-branches',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon, Avatar, BranchActionsMenu],
  templateUrl: './branches.html',
  styleUrl: './branches.scss',
})
export class Branches {
  protected readonly store = inject(BranchesStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  // Pagination
  protected readonly page = signal(1);
  protected readonly total = computed(() => this.store.branches().length);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.pageCount() }, (_, i) => i + 1));
  protected readonly paged = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.store.branches().slice(start, start + PAGE_SIZE);
  });
  protected readonly showingFrom = computed(() => (this.total() ? (this.page() - 1) * PAGE_SIZE + 1 : 0));
  protected readonly showingTo = computed(() => Math.min(this.page() * PAGE_SIZE, this.total()));
  protected goToPage(n: number): void { if (n >= 1 && n <= this.pageCount()) this.page.set(n); }

  protected view(b: Branch): void { this.router.navigate(['/settings/branches', b.id]); }

  // Add branch drawer
  protected readonly addOpen = signal(false);
  protected readonly bName = signal('');
  protected readonly bCity = signal('');
  protected readonly bAddress = signal('');
  protected readonly bManager = signal('');
  protected readonly bMobile = signal('');
  protected readonly canAdd = computed(() => this.bName().trim().length > 1 && this.bCity().trim().length > 1);
  protected openAdd(): void {
    this.bName.set(''); this.bCity.set(''); this.bAddress.set(''); this.bManager.set(''); this.bMobile.set('');
    this.addOpen.set(true);
  }
  protected save(): void {
    if (!this.canAdd()) return;
    this.store.add({ name: this.bName(), city: this.bCity(), address: this.bAddress(), manager: this.bManager(), mobile: this.bMobile() });
    this.addOpen.set(false);
    this.toast.show(`${this.bName().trim()} added`, 'success');
  }
}
