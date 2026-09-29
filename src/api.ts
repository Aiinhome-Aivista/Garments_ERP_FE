const KEY = "loomline.token";
let onAuthLost: () => void = () => {};
export const setAuthLostHandler = (fn: () => void) => (onAuthLost = fn);
export const getToken = (): string | null => localStorage.getItem(KEY);
export const setToken = (t: string | null): void => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

export class ApiError extends Error {
  status: number;
  field?: string;
  constructor(message: string, status: number, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

let inflight = 0;
const subs = new Set<(isBusy: boolean) => void>();
export const onBusy = (fn: (isBusy: boolean) => void) => {
  subs.add(fn);
  return () => subs.delete(fn);
};
const bump = (d: number) => {
  inflight += d;
  subs.forEach((f) => f(inflight > 0));
};

export interface ApiOptions {
  method?: string;
  body?: any;
  quiet?: boolean;
}

export async function api<T = any>(path: string, { method = "GET", body, quiet = false }: ApiOptions = {}): Promise<T> {
  if (!quiet) bump(1);
  try {
    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    };
    const res = await fetch("/api" + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* empty body */
    }
    if (!res.ok) {
      if (res.status === 401 && path !== "/auth/login") {
        console.warn("Auth lost on path:", path, "response:", data);
        onAuthLost();
      }
      throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.field);
    }
    return data;
  } finally {
    if (!quiet) bump(-1);
  }
}

export const qs = (o: Record<string, any>): string => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v !== "" && v != null && p.set(k, String(v)));
  const s = p.toString();
  return s ? "?" + s : "";
};

export const money = (n?: number | string | null): string =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const qty = (n?: number | string | null): string =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

export const today = (): string => new Date().toISOString().slice(0, 10);

export const fdate = (d?: string | Date | null): string =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
