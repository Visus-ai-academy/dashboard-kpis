"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatting";

interface ChartDataPoint {
  date: string;
  value: number;
  cumulative: number;
  projectedTarget: number;
}

interface KpiBarChartProps {
  data: ChartDataPoint[];
  kpiType: string;
}

function formatValue(value: number, type: string): string {
  switch (type) {
    case "MONETARY":
      return formatCurrency(value);
    case "PERCENTAGE":
      return formatPercentage(value);
    default:
      return formatNumber(value);
  }
}

function formatDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

export function KpiBarChart({ data, kpiType }: KpiBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Sem dados para exibir
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateLabel}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v: number) => formatValue(v, kpiType)}
          tick={{ fontSize: 11 }}
          width={80}
        />
        <Tooltip
          formatter={(value: unknown) => [formatValue(Number(value), kpiType), "Valor"]}
          labelFormatter={(label: unknown) => formatDateLabel(String(label))}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid hsl(var(--border))",
            backgroundColor: "hsl(var(--popover))",
            color: "hsl(var(--popover-foreground))",
          }}
        />
        <Bar
          dataKey="value"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
