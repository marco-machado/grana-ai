import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { MonthPicker } from "@/components/MonthPicker";
import { LoadingState, ErrorState } from "@/components/StateDisplay";
import { cn, formatCurrency } from "@/lib/utils";
import { INCOME_COLOR, EXPENSE_COLOR, chartGridStyle, chartAxisStyle, chartTooltipStyle } from "@/lib/chart-theme";
import { useMonthlyData } from "@/hooks/useMonthlyData";

function SummaryCard({
  title,
  value,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>{title}</CardTitle>
        <Icon className={cn("h-4 w-4", colorClass)} />
      </CardHeader>
      <CardContent>
        <p className={cn("text-2xl font-bold", colorClass)}>
          {formatCurrency(value)}
        </p>
      </CardContent>
    </Card>
  );
}

export function VisaoMensal() {
  const { currentMonth, summary, trend, loading, error, goToPreviousMonth, goToNextMonth } =
    useMonthlyData();

  if (error) {
    return (
      <div>
        <PageHeader title="Visão Mensal" />
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Visão Mensal"
        actions={
          <MonthPicker
            currentMonth={currentMonth}
            onPrevious={goToPreviousMonth}
            onNext={goToNextMonth}
          />
        }
      />

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <SummaryCard
              title="Receitas"
              value={summary.income}
              icon={TrendingUp}
              colorClass="text-income"
            />
            <SummaryCard
              title="Despesas"
              value={Math.abs(summary.expenses)}
              icon={TrendingDown}
              colorClass="text-expense"
            />
            <SummaryCard
              title="Saldo"
              value={summary.balance}
              icon={Wallet}
              colorClass={summary.balance >= 0 ? "text-income" : "text-expense"}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Receitas vs Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="gradientIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={INCOME_COLOR} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={INCOME_COLOR} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradientExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={EXPENSE_COLOR} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={EXPENSE_COLOR} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...chartGridStyle} />
                    <XAxis
                      dataKey="label"
                      tick={chartAxisStyle}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={chartAxisStyle}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        new Intl.NumberFormat("pt-BR", {
                          notation: "compact",
                          compactDisplay: "short",
                        }).format(v)
                      }
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Receitas"
                      stroke={INCOME_COLOR}
                      fill="url(#gradientIncome)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Despesas"
                      stroke={EXPENSE_COLOR}
                      fill="url(#gradientExpenses)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
