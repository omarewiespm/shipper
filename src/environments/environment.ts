/**
 * Environment config (requirements §3 — "API base URL and environment config").
 * `dataBase` points at the seeded JSON mocks today; swap the domain-API provider
 * lines (see core/data) to hit `apiBase` when the real backend contract lands.
 */
export const environment = {
  production: false,
  /** Real backend base (unused until services swap from mock to HTTP impls). */
  apiBase: '/api',
  /** Static JSON mock root (relative — resolved against `<base href>`). */
  dataBase: 'mock',
  /** Simulated latency (ms) for mock responses, so loading/skeleton states show. */
  mockLatencyMs: 350,
};
