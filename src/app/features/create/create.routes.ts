import { Routes } from '@angular/router';
import { CreateShipmentStore } from './create.store';

/** /shipments/create — entry choice, single-create, AI create, bulk upload.
 *  One store is shared across the flow so the AI agent can fill it and hand off
 *  to the form. */
export const CREATE_ROUTES: Routes = [
  {
    path: '',
    providers: [CreateShipmentStore],
    children: [
      { path: '', loadComponent: () => import('./create-entry').then((m) => m.CreateEntry), title: 'Create shipment · Madar' },
      { path: 'single', loadComponent: () => import('./create-single').then((m) => m.CreateSingle), title: 'Create shipment · Madar' },
      { path: 'bulk', loadComponent: () => import('./create-bulk').then((m) => m.CreateBulk), title: 'Bulk upload · Madar' },
    ],
  },
];
