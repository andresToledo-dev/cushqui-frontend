export type TxType = "EXPENSE" | "INCOME" | "TRANSFER";
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
  initialBalance: number;
  currentBalance?: number;
  isActive: boolean;
  icon?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  userId?: string | null;
  parentId?: string | null;
  subcategories?: Category[];
}

export interface Transaction {
  id: string;
  accountId: string;
  toAccountId?: string;
  accountName?: string;
  toAccountName?: string;
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
