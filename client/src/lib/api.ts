export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Array<{ path: string; message: string }>;

  constructor(status: number, message: string, code?: string, details?: ApiError['details']) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  0: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.',
  401: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  403: 'Anda tidak memiliki akses untuk tindakan ini.',
  404: 'Data tidak ditemukan.',
  429: 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.',
};
const SERVER_ERROR = 'Terjadi gangguan pada server. Silakan coba beberapa saat lagi.';

/** Pesan yang aman ditampilkan ke pengguna untuk error apa pun. */
export function errorMessage(error: unknown, fallback = SERVER_ERROR): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** Pesan galat per field dari respons validasi server (path "items.0.nominal" → "items"). */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.details) return {};
  const result: Record<string, string> = {};
  for (const detail of error.details) {
    const field = detail.path.split('.')[0] ?? '';
    result[field] ??= detail.message;
  }
  return result;
}

const CSRF_COOKIE = 'sk_csrf';
const NO_REFRESH = new Set(['/auth/refresh', '/auth/logout', '/auth/csrf']);

/** 401 dari langkah login (kata sandi / MFA) berarti kredensial salah, bukan sesi kedaluwarsa. */
function bolehRefresh(path: string): boolean {
  return !NO_REFRESH.has(path) && !path.startsWith('/auth/login');
}

function readCookie(name: string): string | undefined {
  const entry = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

let csrfRequest: Promise<string> | null = null;

async function csrfToken(forceFetch = false): Promise<string> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing && !forceFetch) return existing;
  csrfRequest ??= fetch('/api/auth/csrf', { credentials: 'same-origin' })
    .then((res) => res.json() as Promise<{ csrfToken: string }>)
    .then((body) => body.csrfToken)
    .finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}

let refreshRequest: Promise<boolean> | null = null;

/** Satu permintaan refresh untuk banyak request 401 yang datang bersamaan. */
function refreshSession(): Promise<boolean> {
  refreshRequest ??= csrfToken()
    .then((token) => fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': token } }))
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshRequest = null;
    });
  return refreshRequest;
}

/** Mengambil berkas privat (mis. gambar tanda tangan) sebagai Blob, termasuk refresh sesi bila perlu. */
export async function ambilBlob(path: string): Promise<Blob> {
  const request = () => fetch(`/api${path}`, { credentials: 'same-origin' });
  let res: Response;
  try {
    res = await request();
    if (res.status === 401 && (await refreshSession())) res = await request();
  } catch {
    throw new ApiError(0, DEFAULT_MESSAGES[0]!, 'NETWORK_ERROR');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.message ?? DEFAULT_MESSAGES[res.status] ?? SERVER_ERROR, data?.code);
  }
  return res.blob();
}

/** Mengunduh berkas lewat sesi cookie, termasuk refresh token bila perlu. */
export async function downloadFile(path: string, filename?: string): Promise<void> {
  const request = () => fetch(`/api${path}`, { credentials: 'same-origin' });
  let res: Response;
  try {
    res = await request();
    if (res.status === 401 && (await refreshSession())) res = await request();
  } catch {
    throw new ApiError(0, DEFAULT_MESSAGES[0]!, 'NETWORK_ERROR');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.message ?? DEFAULT_MESSAGES[res.status] ?? SERVER_ERROR, data?.code);
  }
  const nama = filename ?? namaDariHeader(res.headers.get('Content-Disposition')) ?? 'berkas';
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = nama;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function namaDariHeader(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) return decodeURIComponent(utf8[1]);
  return /filename="([^"]+)"/i.exec(header)?.[1] ?? null;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const isForm = body instanceof FormData;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = await csrfToken();

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      signal,
      body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError(0, DEFAULT_MESSAGES[0]!, 'NETWORK_ERROR');
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!isRetry && res.status === 401 && bolehRefresh(path) && (await refreshSession())) {
    return api<T>(path, options, true);
  }
  if (!isRetry && res.status === 403 && data?.code === 'CSRF_INVALID') {
    await csrfToken(true);
    return api<T>(path, options, true);
  }
  if (!res.ok) {
    const message = data?.message ?? DEFAULT_MESSAGES[res.status] ?? SERVER_ERROR;
    throw new ApiError(res.status, message, data?.code, data?.details);
  }
  return data as T;
}

export type OnProgres = (persen: number) => void;

function kirimXhr(method: string, path: string, body: FormData, token: string, onProgres?: OnProgres): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `/api${path}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('X-CSRF-Token', token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgres?.(Math.min(100, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      let data = null;
      try {
        data = xhr.status === 204 || !xhr.responseText ? null : JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      resolve({ status: xhr.status, data });
    };
    xhr.onerror = () => reject(new ApiError(0, DEFAULT_MESSAGES[0]!, 'NETWORK_ERROR'));
    xhr.onabort = () => reject(new ApiError(0, 'Unggahan dibatalkan.', 'ABORTED'));
    xhr.send(body);
  });
}

/**
 * Mengirim berkas (FormData) dengan laporan progres unggah. Memakai XHR karena `fetch` belum
 * bisa melaporkan progres unggah; aturan sesi, CSRF, dan galat sama dengan `api()`.
 */
export async function kirimBerkas<T>(
  path: string,
  body: FormData,
  { method = 'POST', onProgres }: { method?: 'POST' | 'PUT'; onProgres?: OnProgres } = {},
  isRetry = false,
): Promise<T> {
  const { status, data } = await kirimXhr(method, path, body, await csrfToken(), onProgres);
  if (!isRetry && status === 401 && bolehRefresh(path) && (await refreshSession())) {
    onProgres?.(0);
    return kirimBerkas<T>(path, body, { method, onProgres }, true);
  }
  if (!isRetry && status === 403 && data?.code === 'CSRF_INVALID') {
    await csrfToken(true);
    onProgres?.(0);
    return kirimBerkas<T>(path, body, { method, onProgres }, true);
  }
  if (status < 200 || status >= 300) {
    throw new ApiError(status, data?.message ?? DEFAULT_MESSAGES[status] ?? SERVER_ERROR, data?.code, data?.details);
  }
  onProgres?.(100);
  return data as T;
}

/** FormData dari objek; nilai null/undefined dilewati. */
export function keFormData(fields: Record<string, string | number | Blob | null | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === '') continue;
    fd.append(k, v instanceof Blob ? v : String(v));
  }
  return fd;
}
