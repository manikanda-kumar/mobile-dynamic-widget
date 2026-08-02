import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import type { AnalyticsBatch, DemoUser, Manifest, Section, Widget } from '../types/manifest';

export class ApiError extends Error {
  readonly url: string;
  readonly status?: number;

  constructor(message: string, url: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.url = url;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new ApiError(`HTTP ${res.status} ${res.statusText}`.trim(), url, res.status);
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const reason = err instanceof Error && err.name === 'AbortError' ? 'request timed out' : String(err);
    throw new ApiError(reason, url);
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------- normalisers -- */
/* The renderer never trusts the wire shape: it coerces to the typed model and
   drops anything structurally unusable rather than throwing. */

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function normaliseWidget(raw: unknown): Widget | null {
  const w = asRecord(raw);
  const id = typeof w.id === 'string' ? w.id : null;
  const type = typeof w.type === 'string' ? w.type : null;
  if (!id || !type) return null;
  const data = asRecord(w.data);
  return {
    id,
    type,
    priority: typeof w.priority === 'number' ? w.priority : 0,
    size: typeof w.size === 'string' ? (w.size as Widget['size']) : null,
    data: { ...(data as unknown as Widget['data']), title: typeof data.title === 'string' ? data.title : '' },
    analytics: w.analytics ? (w.analytics as Widget['analytics']) : null,
    debug: w.debug ? (w.debug as Widget['debug']) : null,
  };
}

function normaliseSection(raw: unknown): Section | null {
  const s = asRecord(raw);
  const id = typeof s.id === 'string' ? s.id : null;
  const layout = typeof s.layout === 'string' ? s.layout : null;
  if (!id || !layout) return null;
  const widgets = Array.isArray(s.widgets)
    ? s.widgets.map(normaliseWidget).filter((w): w is Widget => w !== null)
    : [];
  return {
    id,
    layout,
    title: typeof s.title === 'string' ? s.title : null,
    columns: typeof s.columns === 'number' ? s.columns : null,
    widgets,
  };
}

function normaliseManifest(raw: unknown): Manifest {
  const m = asRecord(raw);
  const theme = asRecord(m.theme);
  const sections = Array.isArray(m.sections)
    ? m.sections.map(normaliseSection).filter((s): s is Section => s !== null)
    : [];
  return {
    version: typeof m.version === 'number' ? m.version : 0,
    generatedAt: typeof m.generatedAt === 'string' ? m.generatedAt : '',
    userId: typeof m.userId === 'string' ? m.userId : 'anon',
    layout: typeof m.layout === 'string' ? m.layout : 'unknown',
    theme: theme as unknown as Manifest['theme'],
    experiments: Array.isArray(m.experiments) ? (m.experiments as Manifest['experiments']) : [],
    sections,
  };
}

function normaliseUsers(raw: unknown): DemoUser[] {
  // Tolerates `User[]` and `{ users: User[] }`.
  const list = Array.isArray(raw) ? raw : Array.isArray(asRecord(raw).users) ? (asRecord(raw).users as unknown[]) : [];
  const out: DemoUser[] = [];
  list
    .map((entry): DemoUser | null => {
      const u = asRecord(entry);
      const id = typeof u.id === 'string' ? u.id : typeof u.userId === 'string' ? u.userId : null;
      if (!id) return null;
      const name =
        typeof u.name === 'string'
          ? u.name
          : typeof u.displayName === 'string'
            ? u.displayName
            : typeof u.label === 'string'
              ? u.label
              : id;
      return {
        id,
        name,
        segment: typeof u.segment === 'string' ? u.segment : null,
        description: typeof u.description === 'string' ? u.description : null,
      };
    })
    .forEach((u) => {
      if (u) out.push(u);
    });
  return out;
}

/* ---------------------------------------------------------------- endpoints -- */

export async function fetchUsers(): Promise<DemoUser[]> {
  return normaliseUsers(await request<unknown>('/api/v1/users'));
}

export async function fetchManifest(userId: string, debug: boolean): Promise<Manifest> {
  const qs = new URLSearchParams({ userId });
  if (debug) qs.set('debug', '1');
  const raw = await request<unknown>(`/api/v1/manifest?${qs.toString()}`, {
    headers: { 'X-User-Id': userId },
  });
  return normaliseManifest(raw);
}

export async function postAnalytics(batch: AnalyticsBatch): Promise<number> {
  const res = await request<{ accepted?: number }>('/api/v1/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
  });
  return typeof res?.accepted === 'number' ? res.accepted : batch.events.length;
}
