import { computed, Injectable, signal } from '@angular/core';

export type Role = 'owner' | 'finance' | 'procurement' | 'warehouse';
export interface Member {
  id: string;
  code: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  status: 'active' | 'pending';
  lastActive: string;
}
export interface RoleMeta { key: Role; label: string; desc: string; tone: string; }

export const ROLES: RoleMeta[] = [
  { key: 'owner', label: 'Owner', desc: 'Full access to everything, including billing & team.', tone: 'navy' },
  { key: 'finance', label: 'Finance', desc: 'Wallet, invoices & payments.', tone: 'gold' },
  { key: 'procurement', label: 'Procurement', desc: 'Create & manage shipments and partners.', tone: 'sky' },
  { key: 'warehouse', label: 'Warehouse', desc: 'Pickups, deliveries & delivery notes.', tone: 'info' },
];

@Injectable({ providedIn: 'root' })
export class TeamStore {
  readonly roles = ROLES;
  readonly assignableRoles = ROLES.filter((r) => r.key !== 'owner');

  private readonly _members = signal<Member[]>(SEED);
  readonly members = this._members.asReadonly();
  readonly active = computed(() => this._members().filter((m) => m.status === 'active'));
  readonly pending = computed(() => this._members().filter((m) => m.status === 'pending'));

  roleMeta(role: Role): RoleMeta { return ROLES.find((r) => r.key === role) ?? ROLES[0]; }
  byId(id: string): Member | undefined { return this._members().find((m) => m.id === id); }

  setRole(id: string, role: Role): void {
    this._members.update((list) => list.map((m) => (m.id === id ? { ...m, role } : m)));
  }
  approve(id: string): void {
    this._members.update((list) => list.map((m) => (m.id === id ? { ...m, status: 'active', lastActive: 'Just joined' } : m)));
  }
  remove(id: string): void {
    this._members.update((list) => list.filter((m) => m.id !== id));
  }
  invite(input: { name: string; email: string; mobile: string; role: Role }): void {
    const n = this._members().length + 1;
    this._members.update((list) => [...list, {
      id: `TM-${n}`, code: `EMP-${String(n).padStart(3, '0')}`,
      name: input.name.trim(), email: input.email.trim(), mobile: input.mobile.trim() || '—',
      role: input.role, status: 'pending', lastActive: 'Invited just now',
    }]);
  }
}

const SEED: Member[] = [
  { id: 'TM-1', code: 'EMP-001', name: 'Ewies Al Rawabi', email: 'ewies@rawabi.sa', mobile: '+966 55 100 2001', role: 'owner', status: 'active', lastActive: 'Online now' },
  { id: 'TM-2', code: 'EMP-002', name: 'Huda Al Salem', email: 'huda.finance@rawabi.sa', mobile: '+966 55 100 2002', role: 'finance', status: 'active', lastActive: '2h ago' },
  { id: 'TM-3', code: 'EMP-003', name: 'Majed Al Harbi', email: 'majed.ops@rawabi.sa', mobile: '+966 55 100 2003', role: 'procurement', status: 'active', lastActive: 'Yesterday' },
  { id: 'TM-4', code: 'EMP-004', name: 'Sara Al Otaibi', email: 'sara.wh@rawabi.sa', mobile: '+966 55 100 2004', role: 'warehouse', status: 'active', lastActive: '3 days ago' },
  { id: 'TM-5', code: 'EMP-005', name: 'Faisal Al Dosari', email: 'faisal@rawabi.sa', mobile: '+966 55 100 2005', role: 'procurement', status: 'pending', lastActive: 'Invited 2d ago' },
  { id: 'TM-6', code: 'EMP-006', name: 'Noura Al Qahtani', email: 'noura.finance@rawabi.sa', mobile: '+966 55 100 2006', role: 'finance', status: 'pending', lastActive: 'Invited 5d ago' },
];
