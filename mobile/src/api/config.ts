export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'
).replace(/\/+$/, '');

/** Milliseconds before a request is treated as unreachable. */
export const REQUEST_TIMEOUT_MS = 6000;
