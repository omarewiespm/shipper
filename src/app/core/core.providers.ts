import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, Provider } from '@angular/core';

import { AUTH_API, MockAuthApi } from './data/auth.api';
import { BIDDING_API, MockBiddingApi } from './data/bidding.api';
import { CREATE_API, MockCreateApi } from './data/create.api';
import { HOME_API, MockHomeApi } from './data/home.api';
import { INVOICES_API, MockInvoicesApi } from './data/invoices.api';
import { MockPartnersApi, PARTNERS_API } from './data/partners.api';
import { MockReceiversApi, RECEIVERS_API } from './data/receivers.api';
import { MockShipmentsApi, SHIPMENTS_API } from './data/shipments.api';
import { MockWalletApi, WALLET_API } from './data/wallet.api';
import { authInterceptor } from './interceptors/auth.interceptor';
import { baseUrlInterceptor } from './interceptors/base-url.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { loadingInterceptor } from './interceptors/loading.interceptor';

/**
 * Single wiring point for HTTP + the domain-API seam.
 * To move a domain onto the real backend, swap its `useClass` here from the
 * Mock* impl to the Http* impl — no consumer changes (requirements §3).
 */
export function provideCore(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(
      withInterceptors([
        baseUrlInterceptor,
        authInterceptor,
        loadingInterceptor,
        errorInterceptor,
      ]),
    ),

    // Domain-API bindings (mock today).
    { provide: SHIPMENTS_API, useClass: MockShipmentsApi },
    { provide: RECEIVERS_API, useClass: MockReceiversApi },
    { provide: PARTNERS_API, useClass: MockPartnersApi },
    { provide: INVOICES_API, useClass: MockInvoicesApi },
    { provide: WALLET_API, useClass: MockWalletApi },
    { provide: HOME_API, useClass: MockHomeApi },
    { provide: BIDDING_API, useClass: MockBiddingApi },
    { provide: AUTH_API, useClass: MockAuthApi },
    { provide: CREATE_API, useClass: MockCreateApi },
  ];
}
