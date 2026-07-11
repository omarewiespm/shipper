import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { Icon } from '../../shared/ui';
import { PartnerRelationship } from '../../core/data/partners.api';
import { downloadCsv } from '../shipments/csv';

export interface NewPartner {
  name: string; relationship: PartnerRelationship; city: string;
  contactName: string; contactPhone: string; contactEmail: string; invite: boolean;
}

type Mode = 'create' | 'bulk';
type BulkState = 'idle' | 'ready' | 'sending' | 'done';

const TEMPLATE = 'Company name,Relationship (customer/supplier/both),City,Contact name,Phone,Email\r\n'
  + 'Example Trading Co.,customer,Riyadh,Contact Name,+966 5X XXX XXXX,name@company.com\r\n'
  + 'Example Supplier Est.,supplier,Jeddah,Contact Name,+966 5X XXX XXXX,name@company.com';

/** Drawer to add partners — one at a time (Create) or in bulk from a CSV. */
@Component({
  selector: 'app-add-partner-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon],
  templateUrl: './add-partner-drawer.html',
  styleUrl: './add-partner-drawer.scss',
})
export class AddPartnerDrawer {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly saved = output<NewPartner>();
  readonly bulkSaved = output<NewPartner[]>();

  protected readonly mode = signal<Mode>('create');

  // --- Create form ---------------------------------------------------------
  protected readonly name = signal('');
  protected readonly relationship = signal<PartnerRelationship>('customer');
  protected readonly city = signal('');
  protected readonly contactName = signal('');
  protected readonly contactPhone = signal('');
  protected readonly contactEmail = signal('');
  protected readonly invite = signal(true);
  protected readonly rels: { key: PartnerRelationship; label: string; hint: string }[] = [
    { key: 'customer', label: 'Customer', hint: 'I ship to them' },
    { key: 'supplier', label: 'Supplier', hint: 'I collect from them' },
    { key: 'both', label: 'Both', hint: 'Ship & collect' },
  ];
  protected readonly canSave = computed(() => this.name().trim().length > 1);

  // --- Bulk upload ---------------------------------------------------------
  protected readonly bulk = signal<BulkState>('idle');
  protected readonly fileName = signal('');
  protected readonly rows = signal<NewPartner[]>([]);
  protected readonly sent = signal(0);
  protected readonly progress = computed(() => {
    const t = this.rows().length;
    return t ? Math.round((this.sent() / t) * 100) : 0;
  });
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    effect(() => {
      if (!this.open()) return;
      untracked(() => this.reset());
    });
  }

  private reset(): void {
    this.mode.set('create');
    this.name.set(''); this.relationship.set('customer'); this.city.set('');
    this.contactName.set(''); this.contactPhone.set(''); this.contactEmail.set(''); this.invite.set(true);
    this.clearBulk();
  }
  private clearBulk(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; }
    this.bulk.set('idle'); this.fileName.set(''); this.rows.set([]); this.sent.set(0);
  }

  protected setMode(m: Mode): void { this.mode.set(m); if (m === 'create') this.clearBulk(); }

  protected submit(): void {
    if (!this.canSave()) return;
    this.saved.emit({
      name: this.name().trim(), relationship: this.relationship(), city: this.city().trim(),
      contactName: this.contactName().trim(), contactPhone: this.contactPhone().trim(),
      contactEmail: this.contactEmail().trim(), invite: this.invite(),
    });
  }

  // --- Bulk actions --------------------------------------------------------
  protected downloadTemplate(): void {
    downloadCsv('madar-partners-template.csv', TEMPLATE);
  }

  protected onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.fileName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      this.rows.set(this.parse(String(reader.result ?? '')));
      this.bulk.set(this.rows().length ? 'ready' : 'idle');
    };
    reader.readAsText(file);
  }

  private parse(text: string): NewPartner[] {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length && /company|name/i.test(lines[0])) lines.shift(); // drop header
    const rels: PartnerRelationship[] = ['customer', 'supplier', 'both'];
    return lines.map((line) => {
      const c = line.split(',').map((s) => s.trim());
      const rel = (c[1] ?? '').toLowerCase() as PartnerRelationship;
      return {
        name: c[0] ?? '', relationship: rels.includes(rel) ? rel : 'customer',
        city: c[2] ?? '', contactName: c[3] ?? '', contactPhone: c[4] ?? '', contactEmail: c[5] ?? '', invite: true,
      };
    }).filter((r) => r.name.length > 1);
  }

  protected sendInvites(): void {
    const total = this.rows().length;
    if (!total) return;
    this.bulk.set('sending'); this.sent.set(0);
    this.timer = setInterval(() => {
      this.sent.update((n) => n + 1);
      if (this.sent() >= total) {
        clearInterval(this.timer); this.timer = undefined;
        this.bulk.set('done');
        this.bulkSaved.emit(this.rows());
      }
    }, 260);
  }
}
