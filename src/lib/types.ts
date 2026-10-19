export type TxType = "EXPENSE" | "INCOME";
export type MovementType = "OPENING" | "ADJUSTMENT" | "TRANSFER";
export type TxStatus = "UNCLASSIFIED" | "CLASSIFIED";
export type TxSource = "MANUAL" | "APPLE_PAY" | "MBWAY" | "REVOLUT" | "BANK" | "OTHER";
export type AccountType = "BANK" | "CASH" | "CARD" | "WALLET" | "SAVINGS" | "OTHER";
export type CategoryKind = "EXPENSE" | "INCOME";

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  /** Saldo actual. Lo mantiene el backend con cada gasto, ingreso, transferencia o ajuste. */
  balance: number;
  isActive: boolean;
  icon?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  /** Gasto o ingreso. Las subcategorías heredan el de su categoría. */
  type?: CategoryKind;
  icon?: string | null;
  color?: string | null;
  userId?: string | null;
  parentId?: string | null;
  subcategories?: Category[];
}

export interface Transaction {
  id: string;
  accountId: string;
  accountName?: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  amount: number;
  currency: string;
  type: TxType;
  status: TxStatus;
  source: TxSource;
  merchant?: string;
  description?: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Dashboard {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  unclassifiedCount: number;
}

export interface TxFilters {
  accountId?: string;
  categoryId?: string;
  status?: TxStatus;
  type?: TxType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface TxInput {
  accountId: string;
  amount: number;
  type: TxType;
  currency?: string;
  merchant?: string;
  description?: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  transactionDate: string;
}

export interface Movement {
  id: string;
  type: MovementType;
  /** OPENING y TRANSFER: positivo. ADJUSTMENT: con signo. */
  amount: number;
  currency: string;
  /** Cuenta afectada. En una transferencia, la cuenta de origen. */
  account: { id: string; name: string };
  /** Solo en transferencias: cuenta de destino. */
  toAccount?: { id: string; name: string };
  balanceBefore?: number;
  balanceAfter?: number;
  note?: string;
  movementDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface MovementFilters {
  accountId?: string;
  type?: MovementType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export type IntegrationType = "SHORTCUT" | "MANUAL";

/** Token con el que un atajo (o un envío manual) crea import events. */
export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  accountId?: string | null;
  isActive: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Import events recibidos con esta integración. */
  importEventsCount?: number;
  /** Solo al crearla: el backend no lo vuelve a devolver. */
  plainToken?: string;
}
