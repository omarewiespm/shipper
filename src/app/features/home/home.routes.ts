import { Routes } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { Home } from './home';

/** Lazy Home route. Charts are provided here so Chart.js stays in this chunk. */
export const HOME_ROUTES: Routes = [
  {
    path: '',
    component: Home,
    providers: [provideCharts(withDefaultRegisterables())],
    title: 'Home · Madar Shipper',
  },
];
