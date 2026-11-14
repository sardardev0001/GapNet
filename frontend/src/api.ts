import type { Session } from './types';

const STORAGE_KEY = 'gapnet.session';
const prefix = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
let current: Session | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export function loadSession(): Session | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    current = stored ? (JSON.parse(stored) as Session) : null;
  } catch { current = null; }
  return current;
}
export function saveSession(value: Session | null): void {
  current = value;
  if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  else localStorage.removeItem(STORAGE_KEY);
}
export function getSession(): Session | null { return current; }

function extractError(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const data = body as Record<string, unknown>;
    const value = data.detail ?? data.non_field_errors ?? Object.values(data)[0];
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return String(value[0]);
  }
  return status >= 500 ? 'خطایی در سرور رخ داد. دوباره تلاش کنید.' : 'درخواست انجام نشد.';
}

async function refreshAccess(): Promise<string | null> {
  if (!current?.refresh) return null;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const r = await fetch(`${prefix}/api/auth/refresh/`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: current?.refresh }),
        });
        if (!r.ok) { saveSession(null); return null; }
        const tokens = await r.json() as { access: string; refresh?: string };
        if (!current) return null;
        saveSession({ ...current, access: tokens.access, refresh: tokens.refresh ?? current.refresh });
        return tokens.access;
      } catch { return null; }
      finally { refreshInFlight = null; }
    })();
  }
  return refreshInFlight;
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (current?.access) headers.set('Authorization', `Bearer ${current.access}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  let response: Response;
  try { response = await fetch(`${prefix}${path}`, { ...options, headers }); }
  catch { throw new ApiError('ارتباط با سرور برقرار نشد. اتصال خود را بررسی کنید.', 0); }
  if (response.status === 401 && retry && current?.refresh) {
    const token = await refreshAccess();
    if (token) return api<T>(path, options, false);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as unknown;
    throw new ApiError(extractError(body, response.status), response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function post<T>(path: string, payload?: unknown): Promise<T> {
  return api<T>(path, { method: 'POST', body: payload instanceof FormData ? payload : JSON.stringify(payload ?? {}) });
}
export function patch<T>(path: string, payload: unknown): Promise<T> {
  return api<T>(path, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function remove<T>(path: string): Promise<T> { return api<T>(path, { method: 'DELETE' }); }

export async function downloadPrivateFile(path: string, name: string): Promise<void> {
  const fetchOnce = () => fetch(`${prefix}${path}`, {
    headers: { Authorization: `Bearer ${current?.access ?? ''}` },
  });
  let response = await fetchOnce();
  if (response.status === 401 && await refreshAccess()) response = await fetchOnce();
  if (!response.ok) throw new ApiError('دریافت فایل ناموفق بود.', response.status);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name || 'attachment';
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function websocketUrl(ticket: string): string {
  const base = prefix ? new URL(prefix, location.href) : new URL(location.href);
  const scheme = base.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${base.host}/ws/chat/?ticket=${encodeURIComponent(ticket)}`;
}
