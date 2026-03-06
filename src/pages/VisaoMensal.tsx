import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Loader2 } from "lucide-react";
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
import { cn, formatCurrency } from "@/lib/utils";
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

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR });

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Visao Mensal</h2>
        <p className="text-destructive">Erro: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold">Visao Mensal</h2>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={goToPreviousMonth}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium min-w-[140px] text-center capitalize">
            {monthLabel}
          </span>
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <SummaryCard
              title="Receitas"
              value={summary.income}
              icon={TrendingUp}
              colorClass="text-green-500"
            />
            <SummaryCard
              title="Despesas"
              value={Math.abs(summary.expenses)}
              icon={TrendingDown}
              colorClass="text-red-500"
            />
            <SummaryCard
              title="Saldo"
              value={summary.balance}
              icon={Wallet}
              colorClass={summary.balance >= 0 ? "text-green-500" : "text-red-500"}
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
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradientExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 3.7%, 15.9%)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "hsl(240, 5%, 64.9%)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "hsl(240, 5%, 64.9%)", fontSize: 12 }}
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
                      contentStyle={{
                        backgroundColor: "hsl(240, 10%, 3.9%)",
                        border: "1px solid hsl(240, 3.7%, 15.9%)",
                        borderRadius: "0.5rem",
                      }}
                      labelStyle={{ color: "hsl(0, 0%, 98%)" }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Receitas"
                      stroke="hsl(142, 76%, 36%)"
                      fill="url(#gradientIncome)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Despesas"
                      stroke="hsl(0, 84%, 60%)"
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
