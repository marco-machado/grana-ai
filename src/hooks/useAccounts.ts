import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Account } from "@/types/database";

export interface AccountWithStats extends Account {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
}

interface UseAccountsReturn {
  accounts: AccountWithStats[];
  loading: boolean;
  error: string | null;
}

export function useAccounts(): UseAccountsReturn {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAccounts() {
      setLoading(true);
      setError(null);

      const [accountResult, txResult] = await Promise.all([
        supabase.from("account").select("*").order("name"),
        supabase.from("transaction").select("account_id, amount"),
      ]);

      const firstError = accountResult.error ?? txResult.error;
      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      const accountRows = accountResult.data!;
      const transactions = txResult.data!;

      const statsMap = new Map<
        string,
        { income: number; expenses: number; count: number }
      >();

      for (const tx of transactions) {
        const existing = statsMap.get(tx.account_id) ?? {
          income: 0,
          expenses: 0,
          count: 0,
        };
        if (tx.amount > 0) {
          existing.income += tx.amount;
        } else {
          existing.expenses += tx.amount;
        }
        existing.count += 1;
        statsMap.set(tx.account_id, existing);
      }

      const result: AccountWithStats[] = accountRows.map((account) => {
        const stats = statsMap.get(account.id) ?? {
          income: 0,
          expenses: 0,
          count: 0,
        };
        return {
          ...account,
          totalIncome: stats.income,
          totalExpenses: stats.expenses,
          netBalance: stats.income + stats.expenses,
          transactionCount: stats.count,
        };
      });

      setAccounts(result);
      setLoading(false);
    }

    fetchAccounts();
  }, []);

  return { accounts, loading, error };
}
