import { useQuery } from '@tanstack/react-query'; import { useAuth } from '@/context/AuthProviderClient'

interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  account?: { // Optional account details for global transactions
    name: string;
    currency: string;
  };
}

// This function will now take an optional accountId
const fetchTransactions = async (accountId?: string): Promise<Transaction[]> => {
  const url = accountId ? `/api/accounts/${accountId}/transactions` : `/api/transactions`; // New global transactions API
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  return res.json();
};

// The hook will now take an optional accountId
export const useTransactions = (accountId?: string) => {
  const { user, loading } = useAuth()
  return useQuery<Transaction[]>({
    queryKey: accountId ? ['transactions', accountId] : ['transactions', 'all'], // Adjust queryKey
    queryFn: () => fetchTransactions(accountId),
    enabled: !!user && !loading,
  });
};