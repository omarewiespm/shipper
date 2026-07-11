import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '../storage.service';

export const AUTH_TOKEN_KEY = 'madar.auth.token';

/**
 * Attaches the bearer token when present. Mock JSON requests carry no token
 * (none stored yet) and are sent unchanged. Real token-refresh wiring lands
 * with the auth feature.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(StorageService).get<string | null>(AUTH_TOKEN_KEY, null);
  if (!token) {
    return next(req);
  }
  return next(
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
