import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/auth.guard';
import { AuthLayout } from './auth-layout/auth-layout';
import { AuthStore } from './auth.store';

/** /auth subtree — outside the app shell; one shared AuthStore drives the flow. */
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    component: AuthLayout,
    canActivate: [guestGuard],
    providers: [AuthStore],
    children: [
      { path: '', redirectTo: 'identifier', pathMatch: 'full' },
      { path: 'identifier', loadComponent: () => import('./screens/identifier').then((m) => m.Identifier), title: 'Sign in · Madar' },
      { path: 'password', loadComponent: () => import('./screens/password').then((m) => m.Password), title: 'Sign in · Madar' },
      { path: 'otp', loadComponent: () => import('./screens/otp').then((m) => m.Otp), title: 'Verify · Madar' },
      { path: 'details', loadComponent: () => import('./screens/details').then((m) => m.Details), title: 'Create account · Madar' },
      { path: 'business', loadComponent: () => import('./screens/business').then((m) => m.Business), title: 'Verify business · Madar' },
      { path: 'done', loadComponent: () => import('./screens/done').then((m) => m.Done), title: 'Welcome · Madar' },
      { path: 'forgot', loadComponent: () => import('./screens/forgot').then((m) => m.Forgot), title: 'Reset password · Madar' },
      { path: 'reset', loadComponent: () => import('./screens/reset').then((m) => m.Reset), title: 'Reset password · Madar' },
      { path: '**', redirectTo: 'identifier' },
    ],
  },
];
