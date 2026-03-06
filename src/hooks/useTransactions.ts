import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TransactionWithRelations, Category } from "@/types/database";

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

function escapeFilterValue(value: string): string {
  return value.replace(/[\\%_,()."]/g, (ch) => `\\${ch}`);
}

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    let query = supabase
      .from("transaction")
      .select("*, account(*), category(*)", { count: "exact" });

    if (filters.search) {
      const escaped = escapeFilterValue(filters.search);
      query = query.or(
        `description_raw.ilike.%${escaped}%,description_clean.ilike.%${escaped}%`,
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

    query.then(({ data, error: fetchError, count }) => {
      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setTransactions([]);
        setTotalCount(0);
      } else {
        setTransactions(data as TransactionWithRelations[]);
        setTotalCount(count ?? 0);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [filters, sortField, sortDirection, page]);

  return {
    transactions,
    totalCount,
    totalPages: Math.ceil(totalCount / PAGE_SIZE),
    loading,
    error,
    pageSize: PAGE_SIZE,
  };
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
