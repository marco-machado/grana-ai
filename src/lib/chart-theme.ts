export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
];

export const INCOME_COLOR = "hsl(var(--income))";
export const EXPENSE_COLOR = "hsl(var(--expense))";

export const chartGridStyle = {
  strokeDasharray: "3 3",
  stroke: "hsl(var(--border))",
  opacity: 0.5,
};

export const chartAxisStyle = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 12,
};

export const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "var(--radius)",
};
