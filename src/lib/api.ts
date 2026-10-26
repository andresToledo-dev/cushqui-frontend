import type {
  Account,
  AccountType,
  Category,
  CategoryKind,
  Dashboard,
  Integration,
  IntegrationType,
  Movement,
  MovementFilters,
  Paginated,
  Tokens,
  Transaction,
  TxFilters,
  TxInput,
  User,
} from "./types";

// En local se usa la ruta relativa, que next.config.ts reenvía al backend (ver BACKEND_URL).
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "/api/v1").replace(/\/$/, "");

const ACCESS_KEY = "cushqui.accessToken";
const REFRESH_KEY = "cushqui.refreshToken";
export const LOGOUT_EVENT = "cushqui:logout";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const tokens = {
  get access() {
    return read(ACCESS_KEY);
  },
  get refresh() {
    return read(REFRESH_KEY);
  },
  set(t: Tokens) {
    localStorage.setItem(ACCESS_KEY, t.accessToken);
    localStorage.setItem(REFRESH_KEY, t.refreshToken);
  },
  clear() {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {}
  },
};

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = tokens.refresh;
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      tokens.set((await res.json()) as Tokens);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message: unknown }).message;
    if (Array.isArray(m)) return m.join(". ");
    if (typeof m === "string") return m;
  }
  return `Error ${status}`;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function request<T>(path: string, opts: RequestOptions = {}, retry = true): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. ¿Está el backend en marcha?");
  }

  if (res.status === 401 && auth && retry) {
    if (await refreshTokens()) return request<T>(path, opts, false);
    tokens.clear();
    window.dispatchEvent(new Event(LOGOUT_EVENT));
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!res.ok) throw new ApiError(res.status, errorMessage(data, res.status));
  return data as T;
}

export interface AccountInput {
  name: string;
  type: AccountType;
  currency: string;
  /** Saldo con el que se abre la cuenta. Solo al crearla. */
  balance: number;
  icon?: string;
  color?: string;
}

/** Al editar no se puede tocar el saldo: se cambia con un ajuste (POST /accounts/:id/adjustments). */
export type AccountUpdate = Partial<Omit<AccountInput, "balance">>;

function qs(params: object): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  login: (email: string, password: string) =>
    request<Tokens>("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  register: (email: string, password: string, name: string) =>
    request<Tokens>("/auth/register", { method: "POST", body: { email, password, name }, auth: false }),
  logout: () => request<void>("/auth/logout", { method: "POST" }, false),
  me: () => request<User>("/auth/me"),

  accounts: () => request<Account[]>("/accounts"),
  createAccount: (body: AccountInput) => request<Account>("/accounts", { method: "POST", body }),
  updateAccount: (id: string, body: AccountUpdate) => request<Account>(`/accounts/${id}`, { method: "PATCH", body }),
  /** Fija un nuevo saldo y deja constancia como movimiento ADJUSTMENT. */
  adjustBalance: (id: string, body: { balance: number; note?: string; date?: string }) =>
    request<Account>(`/accounts/${id}/adjustments`, { method: "POST", body }),
  deleteAccount: (id: string) => request<void>(`/accounts/${id}`, { method: "DELETE" }),

  categories: () => request<Category[]>("/categories"),
  createCategory: (body: { name: string; type: CategoryKind; icon?: string; color?: string }) =>
    request<Category>("/categories", { method: "POST", body }),
  updateCategory: (id: string, body: Partial<{ name: string; type: CategoryKind; icon: string; color: string }>) =>
    request<Category>(`/categories/${id}`, { method: "PATCH", body }),
  deleteCategory: (id: string) => request<void>(`/categories/${id}`, { method: "DELETE" }),
  /** El color (#RRGGBB) lo elige la app: un tono degradado del de la categoría. */
  createSubcategory: (parentCategoryId: string, name: string, color: string) =>
    request<Category>("/categories/subcategories", { method: "POST", body: { name, parentCategoryId, color } }),
  updateSubcategory: (id: string, name: string) =>
    request<Category>(`/categories/subcategories/${id}`, { method: "PATCH", body: { name } }),

  transactions: (f: TxFilters = {}) => request<Paginated<Transaction>>(`/transactions${qs(f)}`),
  transaction: (id: string) => request<Transaction>(`/transactions/${id}`),
  createTransaction: (body: TxInput) => request<Transaction>("/transactions", { method: "POST", body }),
  updateTransaction: (id: string, body: Partial<TxInput>) =>
    request<Transaction>(`/transactions/${id}`, { method: "PATCH", body }),
  deleteTransaction: (id: string) => request<void>(`/transactions/${id}`, { method: "DELETE" }),
  classify: (id: string, categoryId: string) =>
    request<Transaction>(`/transactions/${id}/classify`, { method: "POST", body: { categoryId } }),

  createTransfer: (body: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    currency: string;
    date: string;
    note?: string;
  }) => request<{ movementId: string }>("/transfers", { method: "POST", body }),

  /** Edita una transferencia (id del movimiento). El backend recalcula los saldos. */
  updateTransfer: (
    id: string,
    body: Partial<{ fromAccountId: string; toAccountId: string; amount: number; currency: string; date: string; note: string }>,
  ) => request<Movement>(`/transfers/${id}`, { method: "PATCH", body }),

  /** Aperturas, ajustes y transferencias entre cuentas. */
  movements: (f: MovementFilters = {}) => request<Paginated<Movement>>(`/movements${qs(f)}`),

  dashboard: () => request<Dashboard>("/dashboard"),

  integrations: () => request<Integration[]>("/integrations"),
  /** La respuesta trae `plainToken`, que solo se muestra esta vez. */
  createIntegration: (body: { name: string; type: IntegrationType; accountId?: string }) =>
    request<Integration>("/integrations", { method: "POST", body }),
  deleteIntegration: (id: string) => request<void>(`/integrations/${id}`, { method: "DELETE" }),

  /** Recorre todas las páginas de un listado de transacciones. */
  async allTransactions(f: TxFilters = {}): Promise<Transaction[]> {
    const out: Transaction[] = [];
    for (let page = 1; page <= 50; page++) {
      const res = await api.transactions({ ...f, page, limit: 100 });
      out.push(...res.data);
      if (page >= res.meta.totalPages) break;
    }
    return out;
  },
};
