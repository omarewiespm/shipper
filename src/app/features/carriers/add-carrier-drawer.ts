import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { Icon } from '../../shared/ui';
import { CarrierType, NewCarrier } from './carriers.store';

/** Drawer to add a carrier — invites an existing fleet to work with you, or a new one to join Madar. */
@Component({
  selector: 'app-add-carrier-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon],
  templateUrl: './add-carrier-drawer.html',
  styleUrl: './add-carrier-drawer.scss',
})
export class AddCarrierDrawer {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly saved = output<NewCarrier>();

  protected readonly name = signal('');
  protected readonly type = signal<CarrierType>('contracted');
  protected readonly city = signal('');
  protected readonly contactName = signal('');
  protected readonly phone = signal('');
  protected readonly email = signal('');

  protected readonly types: { key: CarrierType; label: string; hint: string }[] = [
    { key: 'contracted', label: 'Contracted', hint: 'Agreed rates' },
    { key: 'marketplace', label: 'Marketplace', hint: 'Open to bids' },
  ];
  protected readonly canSave = computed(() => this.name().trim().length > 1 && (this.phone().trim().length > 3 || this.email().trim().length > 3));

  constructor() {
    effect(() => {
      if (!this.open()) return;
      untracked(() => {
        this.name.set(''); this.type.set('contracted'); this.city.set('');
        this.contactName.set(''); this.phone.set(''); this.email.set('');
      });
    });
  }

  protected submit(): void {
    if (!this.canSave()) return;
    this.saved.emit({
      name: this.name().trim(), type: this.type(), city: this.city().trim(),
      contactName: this.contactName().trim(), phone: this.phone().trim(), email: this.email().trim(),
    });
  }
}
