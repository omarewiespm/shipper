import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Prefixes the API base onto relative endpoints (those not starting with "/"
 * or "http"). Mock requests use absolute "/mock/..." paths and pass straight
 * through — so flipping a domain service from mock to real needs no interceptor
 * change, only its provider swap.
 */
export const baseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const isAbsolute = /^https?:\/\//i.test(req.url) || req.url.startsWith('/');
  if (isAbsolute) {
    return next(req);
  }
  return next(req.clone({ url: `${environment.apiBase}/${req.url}` }));
};
