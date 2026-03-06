import { useState, useEffect, useCallback } from "react";
import { startOfMonth, endOfMonth, subMonths, addMonths, format } from "date-fns";
import { supabase } from "@/lib/supabase";

export interface MonthSummary {
  income: number;
  expenses: number;
  balance: number;
}

export interface MonthTrendPoint {
  month: string;
  label: string;
  income: number;
  expenses: number;
}

interface UseMonthlyDataReturn {
  currentMonth: Date;
  summary: MonthSummary;
  trend: MonthTrendPoint[];
  loading: boolean;
  error: string | null;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
}

async function fetchMonthSummary(month: Date): Promise<MonthSummary> {
  const from = format(startOfMonth(month), "yyyy-MM-dd");
  const to = format(endOfMonth(month), "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("transaction")
    .select("amount")
    .gte("date", from)
    .lte("date", to);

  if (error) throw error;

  let income = 0;
  let expenses = 0;
  for (const t of data ?? []) {
    const amount = Number(t.amount);
    if (amount > 0) income += amount;
    else expenses += amount;
  }

  return { income, expenses, balance: income + expenses };
}

async function fetchTrend(referenceMonth: Date): Promise<MonthTrendPoint[]> {
  const months = 12;
  const from = format(startOfMonth(subMonths(referenceMonth, months - 1)), "yyyy-MM-dd");
  const to = format(endOfMonth(referenceMonth), "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("transaction")
    .select("date, amount")
    .gte("date", from)
    .lte("date", to);

  if (error) throw error;

  const buckets = new Map<string, { income: number; expenses: number }>();

  for (let i = months - 1; i >= 0; i--) {
    const m = subMonths(referenceMonth, i);
    const key = format(m, "yyyy-MM");
    buckets.set(key, { income: 0, expenses: 0 });
  }

  for (const t of data ?? []) {
    const key = t.date.substring(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (t.amount > 0) {
      bucket.income += Number(t.amount);
    } else {
      bucket.expenses += Math.abs(Number(t.amount));
    }
  }

  return Array.from(buckets.entries()).map(([key, val]) => ({
    month: key,
    label: format(new Date(key + "-01"), "MMM yy"),
    income: val.income,
    expenses: val.expenses,
  }));
}

export function useMonthlyData(): UseMonthlyDataReturn {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [summary, setSummary] = useState<MonthSummary>({ income: 0, expenses: 0, balance: 0 });
  const [trend, setTrend] = useState<MonthTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchMonthSummary(currentMonth), fetchTrend(currentMonth)])
      .then(([s, t]) => {
        if (cancelled) return;
        setSummary(s);
        setTrend(t);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? "Erro ao carregar dados");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentMonth]);

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  return { currentMonth, summary, trend, loading, error, goToPreviousMonth, goToNextMonth };
}
