import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';

import { provideCore } from './core/core.providers';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash routing keeps deep links working on GitHub Pages (no SPA server / rewrite rules).
    provideRouter(routes, withComponentInputBinding(), withHashLocation()),
    ...provideCore(),
  ],
};
