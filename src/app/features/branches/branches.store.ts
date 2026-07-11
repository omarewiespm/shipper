import { computed, Injectable, signal } from '@angular/core';

export interface Branch {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  manager: string;
  mobile: string;
  members: number;
  status: 'active' | 'inactive';
  primary: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class BranchesStore {
  private readonly _branches = signal<Branch[]>(SEED);
  readonly branches = this._branches.asReadonly();
  readonly activeCount = computed(() => this._branches().filter((b) => b.status === 'active').length);

  byId(id: string): Branch | undefined { return this._branches().find((b) => b.id === id); }

  setActive(id: string, active: boolean): void {
    this._branches.update((list) => list.map((b) => (b.id === id ? { ...b, status: active ? 'active' : 'inactive' } : b)));
  }
  setPrimary(id: string): void {
    this._branches.update((list) => list.map((b) => ({ ...b, primary: b.id === id })));
  }
  remove(id: string): void {
    this._branches.update((list) => list.filter((b) => b.id !== id));
  }
  add(input: { name: string; city: string; address: string; manager: string; mobile: string }): void {
    const n = this._branches().length + 1;
    this._branches.update((list) => [...list, {
      id: `BR-${n}`, code: `BR-${String(n).padStart(3, '0')}`,
      name: input.name.trim(), city: input.city.trim(), address: input.address.trim() || '—',
      manager: input.manager.trim() || '—', mobile: input.mobile.trim() || '—',
      members: 0, status: 'active', primary: false, createdAt: 'Just now',
    }]);
  }
}

const SEED: Branch[] = [
  { id: 'BR-1', code: 'BR-001', name: 'Riyadh HQ', city: 'Riyadh', address: 'Exit 18, Eastern Ring Rd', manager: 'Majed Al Harbi', mobile: '+966 55 100 3001', members: 9, status: 'active', primary: true, createdAt: '12 Nov 2025' },
  { id: 'BR-2', code: 'BR-002', name: 'Jeddah Depot', city: 'Jeddah', address: 'Al Khumrah Industrial', manager: 'Huda Al Salem', mobile: '+966 55 100 3002', members: 6, status: 'active', primary: false, createdAt: '04 Jan 2026' },
  { id: 'BR-3', code: 'BR-003', name: 'Dammam Yard', city: 'Dammam', address: '2nd Industrial City', manager: 'Sara Al Otaibi', mobile: '+966 55 100 3003', members: 4, status: 'active', primary: false, createdAt: '19 Feb 2026' },
  { id: 'BR-4', code: 'BR-004', name: 'Makkah Store', city: 'Makkah', address: 'Al Awali District', manager: 'Faisal Al Dosari', mobile: '+966 55 100 3004', members: 2, status: 'inactive', primary: false, createdAt: '09 Mar 2026' },
];
