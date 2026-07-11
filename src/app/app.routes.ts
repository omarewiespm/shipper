import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { Shell } from './layout/shell/shell';
import { Placeholder } from './shared/placeholder/placeholder';

/**
 * `/auth` sits outside the shell. Everything else is wrapped by the Shell and
 * gated by authGuard. Feature routes are lazy; not-yet-built screens resolve to
 * the Placeholder so the shell and nav stay navigable.
 */
export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },

      {
        path: 'home',
        loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
      },

      { path: 'create', redirectTo: 'shipments/create', pathMatch: 'full' },
      {
        path: 'shipments',
        loadComponent: () => import('./features/shipments/shipments').then((m) => m.Shipments),
        title: 'Shipments · Madar',
      },
      {
        path: 'shipments/create',
        loadChildren: () => import('./features/create/create.routes').then((m) => m.CREATE_ROUTES),
      },
      {
        path: 'shipments/:id',
        loadComponent: () => import('./features/shipments/detail/shipment-detail').then((m) => m.ShipmentDetail),
        title: 'Shipment · Madar',
      },
      {
        path: 'partners',
        children: [
          { path: '', redirectTo: 'directory', pathMatch: 'full' },
          {
            path: 'directory',
            loadComponent: () => import('./features/partners/partners').then((m) => m.Partners),
            data: { tab: 'directory' },
            title: 'Partners · Madar',
          },
          {
            path: 'directory/:id',
            loadComponent: () => import('./features/partners/partner').then((m) => m.PartnerDetail),
            title: 'Partner · Madar',
          },
          {
            path: 'sales',
            loadComponent: () => import('./features/partners/orders').then((m) => m.Orders),
            data: { type: 'selling' },
            title: 'Sales Orders · Madar',
          },
          {
            path: 'po',
            loadComponent: () => import('./features/partners/orders').then((m) => m.Orders),
            data: { type: 'buying' },
            title: 'Purchase Orders · Madar',
          },
          {
            path: 'po/new',
            loadComponent: () => import('./features/partners/create-po').then((m) => m.CreatePo),
            title: 'New purchase order · Madar',
          },
          {
            path: 'order/:id',
            loadComponent: () => import('./features/partners/order-detail').then((m) => m.OrderDetail),
            title: 'Order · Madar',
          },
        ],
      },
      { path: 'receivers', redirectTo: 'partners', pathMatch: 'full' },
      {
        path: 'carriers',
        children: [
          { path: '', redirectTo: 'directory', pathMatch: 'full' },
          { path: 'directory', loadComponent: () => import('./features/carriers/carriers').then((m) => m.Carriers), data: { tab: 'directory' }, title: 'Carriers · Madar' },
          { path: 'map', loadComponent: () => import('./features/carriers/carriers').then((m) => m.Carriers), data: { tab: 'map' }, title: 'Active carriers · Madar' },
          { path: 'delivery-notes', loadComponent: () => import('./features/carriers/carriers').then((m) => m.Carriers), data: { tab: 'notes' }, title: 'Delivery notes · Madar' },
        ],
      },
      {
        path: 'tracking',
        loadComponent: () => import('./features/tracking/tracking').then((m) => m.Tracking),
        title: 'Live tracking · Madar',
      },
      { path: 'payments', redirectTo: 'payments/wallet', pathMatch: 'full' },
      { path: 'payments/wallet', loadComponent: () => import('./features/payments/wallet').then((m) => m.Wallet), title: 'Wallet · Madar' },
      { path: 'payments/invoices', loadComponent: () => import('./features/payments/invoices').then((m) => m.Invoices), title: 'Invoices · Madar' },
      { path: 'payments/invoices/:id', loadComponent: () => import('./features/payments/invoice-detail').then((m) => m.InvoiceDetail), title: 'Invoice · Madar' },
      { path: 'payments/:tab', component: Placeholder, data: { title: 'Financials' }, title: 'Financials · Madar' },
      { path: 'reports', component: Placeholder, data: { title: 'Reports' }, title: 'Reports · Madar' },
      { path: 'reports/:report', component: Placeholder, data: { title: 'Reports' }, title: 'Reports · Madar' },
      { path: 'settings', component: Placeholder, data: { title: 'Settings' }, title: 'Settings · Madar' },
      { path: 'settings/users', loadComponent: () => import('./features/team/team').then((m) => m.Team), title: 'Team · Madar' },
      { path: 'settings/users/:id', loadComponent: () => import('./features/team/team-member').then((m) => m.TeamMember), title: 'Team member · Madar' },
      { path: 'settings/branches', loadComponent: () => import('./features/branches/branches').then((m) => m.Branches), title: 'Branches · Madar' },
      { path: 'settings/branches/:id', loadComponent: () => import('./features/branches/branch').then((m) => m.Branch), title: 'Branch · Madar' },
      { path: 'settings/:section', component: Placeholder, data: { title: 'Settings' }, title: 'Settings · Madar' },
      { path: 'signing', component: Placeholder, data: { title: 'Signing' }, title: 'Signing · Madar' },
      {
        path: 'integrations',
        loadComponent: () => import('./features/integrations/integrations').then((m) => m.Integrations),
        title: 'Integrations · Madar',
      },
      {
        path: 'integrations/:id',
        loadComponent: () => import('./features/integrations/integration-detail').then((m) => m.IntegrationDetail),
        title: 'Integration · Madar',
      },

      { path: '**', redirectTo: 'home' },
    ],
  },
];
