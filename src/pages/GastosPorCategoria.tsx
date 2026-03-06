import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { BarChart3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { MonthPicker } from "@/components/MonthPicker";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateDisplay";
import { CHART_COLORS } from "@/lib/chart-theme";
import { formatCurrency } from "@/lib/utils";
import { useCategorySpending } from "@/hooks/useCategorySpending";

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { categoryName: string; total: number; percentage: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{d.categoryName}</p>
      <p>{formatCurrency(d.total)}</p>
      <p className="text-muted-foreground">{d.percentage.toFixed(1)}%</p>
    </div>
  );
}

export function GastosPorCategoria() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data, totalSpending, loading, error } = useCategorySpending(
    startDate,
    endDate,
  );

  return (
    <div>
      <PageHeader
        title="Gastos por Categoria"
        actions={
          <MonthPicker
            currentMonth={currentMonth}
            onPrevious={() => setCurrentMonth((m) => subMonths(m, 1))}
            onNext={() => setCurrentMonth((m) => addMonths(m, 1))}
          />
        }
      />

      {loading && <LoadingState />}

      {error && <ErrorState message={error} />}

      {!loading && !error && data.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="Nenhum gasto encontrado"
          description="Nenhum gasto encontrado neste período."
        />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="total"
                      nameKey="categoryName"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={60}
                    >
                      {data.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                      <tspan x="50%" dy="-0.5em" className="fill-muted-foreground text-xs">Total</tspan>
                      <tspan x="50%" dy="1.4em" className="fill-foreground text-sm font-semibold">
                        {formatCurrency(totalSpending)}
                      </tspan>
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ranking</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => formatCurrency(v)}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="categoryName"
                      width={130}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                    />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {data.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.map((item, i) => (
                  <div
                    key={item.categoryId}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-sm font-medium">
                        {item.categoryName}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {item.percentage.toFixed(1)}%
                      </span>
                      <span className="text-sm font-medium w-28 text-right">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 font-semibold">
                  <span className="text-sm">Total</span>
                  <span className="text-sm w-28 text-right">
                    {formatCurrency(totalSpending)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
