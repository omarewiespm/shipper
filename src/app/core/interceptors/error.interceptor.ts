import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Central place for global HTTP error handling. For now it normalises and
 * re-throws so feature stores can surface inline "retry" errors (UI spec §4).
 * Hook toast/redirect-on-401 here when auth lands.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const message =
        err.status === 0
          ? 'Network unavailable. Check your connection and try again.'
          : `Request failed (${err.status}).`;
      return throwError(() => ({ status: err.status, message, cause: err }));
    }),
  );
