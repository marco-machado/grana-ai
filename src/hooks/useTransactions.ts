import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { TransactionWithRelations, Account, Category } from "@/types/database";

export type SortField = "date" | "amount" | "description";
export type SortDirection = "asc" | "desc";

export interface TransactionFilters {
  search: string;
  accountId: string;
  categoryId: string;
  dateStart: string;
  dateEnd: string;
}

const PAGE_SIZE = 25;

export function useTransactions(
  filters: TransactionFilters,
  sortField: SortField,
  sortDirection: SortDirection,
  page: number,
) {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("transaction")
      .select("*, account(*), category(*)", { count: "exact" });

    if (filters.search) {
      query = query.or(
        `description_raw.ilike.%${filters.search}%,description_clean.ilike.%${filters.search}%`,
      );
    }

    if (filters.accountId) {
      query = query.eq("account_id", filters.accountId);
    }

    if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }

    if (filters.dateStart) {
      query = query.gte("date", filters.dateStart);
    }

    if (filters.dateEnd) {
      query = query.lte("date", filters.dateEnd);
    }

    const sortColumn =
      sortField === "description" ? "description_raw" : sortField;
    query = query.order(sortColumn, { ascending: sortDirection === "asc" });

    const from = page * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, error: fetchError, count } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setTransactions([]);
      setTotalCount(0);
    } else {
      setTransactions(data as TransactionWithRelations[]);
      setTotalCount(count ?? 0);
    }

    setLoading(false);
  }, [filters, sortField, sortDirection, page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    totalCount,
    totalPages: Math.ceil(totalCount / PAGE_SIZE),
    loading,
    error,
    pageSize: PAGE_SIZE,
  };
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    supabase
      .from("account")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setAccounts(data);
      });
  }, []);

  return accounts;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    supabase
      .from("category")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  return categories;
}
