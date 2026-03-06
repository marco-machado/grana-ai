import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
}

interface UseCategorySpendingResult {
  data: CategorySpending[];
  totalSpending: number;
  loading: boolean;
  error: string | null;
}

export function useCategorySpending(
  startDate: string,
  endDate: string,
): UseCategorySpendingResult {
  const [data, setData] = useState<CategorySpending[]>([]);
  const [totalSpending, setTotalSpending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);

      const { data: rows, error: queryError } = await supabase
        .from("transaction")
        .select("amount, category:category_id(id, name)")
        .lt("amount", 0)
        .gte("date", startDate)
        .lte("date", endDate);

      if (cancelled) return;

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const byCategoryMap = new Map<
        string,
        { categoryId: string; categoryName: string; total: number }
      >();

      for (const row of rows ?? []) {
        const cat = row.category as unknown as { id: string; name: string } | null;
        const key = cat?.id ?? "uncategorized";
        const name = cat?.name ?? "Sem categoria";
        const absAmount = Math.abs(row.amount);

        const existing = byCategoryMap.get(key);
        if (existing) {
          existing.total += absAmount;
        } else {
          byCategoryMap.set(key, {
            categoryId: key,
            categoryName: name,
            total: absAmount,
          });
        }
      }

      const total = Array.from(byCategoryMap.values()).reduce(
        (sum, c) => sum + c.total,
        0,
      );

      const result: CategorySpending[] = Array.from(byCategoryMap.values())
        .map((c) => ({
          ...c,
          percentage: total > 0 ? (c.total / total) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);

      setData(result);
      setTotalSpending(total);
      setLoading(false);
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  return { data, totalSpending, loading, error };
}
