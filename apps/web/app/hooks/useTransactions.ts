import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProviderClient'

interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  categoryKey?: string | null;
  notes?: string | null;
  category?: {
    key: string;
    name: string;
    icon?: string | null;
    color?: string | null;
    type: 'income' | 'expense' | 'transfer';
  } | null;
  account?: { // Optional account details for global transactions
    name: string;
    currency: string;
  };
  fromAccount?: {
    name: string;
    currency: string;
  };
  toAccount?: {
    name: string;
    currency: string;
  };
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number | 'all';
  hasMore: boolean;
  summary: {
    income: number;
    expense: number;
    net: number;
  };
}

interface FetchTransactionsOptions {
  accountId?: string;
  page?: number;
  pageSize?: number | 'all';
  search?: string;
  type?: 'all' | 'income' | 'expense' | 'transfer' | 'exchange';
  categoryKey?: string;
  fromDate?: string;
  toDate?: string;
}

const fetchTransactions = async ({
  accountId,
  page = 1,
  pageSize = 30,
  search,
  type,
  categoryKey,
  fromDate,
  toDate,
}: FetchTransactionsOptions): Promise<TransactionsResponse> => {
  const url = new URL(
    accountId ? `/api/accounts/${accountId}/transactions` : '/api/transactions',
    window.location.origin,
  )

  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(pageSize))
  if (search?.trim()) {
    url.searchParams.set('search', search.trim())
  }
  if (type && type !== 'all') {
    url.searchParams.set('type', type)
  }
  if (categoryKey && categoryKey !== 'all') {
    url.searchParams.set('categoryKey', categoryKey)
  }
  if (fromDate) {
    url.searchParams.set('fromDate', fromDate)
  }
  if (toDate) {
    url.searchParams.set('toDate', toDate)
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  return res.json();
};

export const useTransactions = (options?: FetchTransactionsOptions) => {
  const { user, loading } = useAuth()
  const accountId = options?.accountId
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 30
  const search = options?.search ?? ''
  const type = options?.type ?? 'all'
  const categoryKey = options?.categoryKey ?? 'all'
  const fromDate = options?.fromDate ?? ''
  const toDate = options?.toDate ?? ''

  return useQuery<TransactionsResponse>({
    queryKey: accountId
      ? ['transactions', accountId, page, pageSize, search, type, categoryKey, fromDate, toDate]
      : ['transactions', 'all', page, pageSize, search, type, categoryKey, fromDate, toDate],
    queryFn: () =>
      fetchTransactions({
        accountId,
        page,
        pageSize,
        search,
        type,
        categoryKey,
        fromDate,
        toDate,
      }),
    enabled: !!user && !loading,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 30,
  });
};
