"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatting";

interface ChartDataPoint {
  date: string;
  value: number;
  cumulative: number;
  projectedTarget: number;
}

interface KpiLineChartProps {
  data: ChartDataPoint[];
  kpiType: string;
  mode?: "cumulative" | "daily";
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

export function KpiLineChart({ data, kpiType, mode = "cumulative" }: KpiLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Sem dados para exibir
      </div>
    );
  }

  const dataKey = mode === "cumulative" ? "cumulative" : "value";
  const achievedLabel = mode === "cumulative" ? "Realizado Acumulado" : "Valor Diario";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateLabel}
          className="text-xs"
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v: number) => formatValue(v, kpiType)}
          className="text-xs"
          tick={{ fontSize: 11 }}
          width={80}
        />
        <Tooltip
          formatter={(value: unknown, name: unknown) => [
            formatValue(Number(value), kpiType),
            String(name),
          ]}
          labelFormatter={(label: unknown) => formatDateLabel(String(label))}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid hsl(var(--border))",
            backgroundColor: "hsl(var(--popover))",
            color: "hsl(var(--popover-foreground))",
          }}
        />
        <Legend />
        {/* Achieved line - solid red */}
        <Line
          type="monotone"
          dataKey={dataKey}
          name={achievedLabel}
          stroke="hsl(0, 72%, 51%)"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        {/* Target projection line - dashed green (cumulative mode only) */}
        {mode === "cumulative" && (
          <Line
            type="monotone"
            dataKey="projectedTarget"
            name="Meta Projetada"
            stroke="hsl(142, 71%, 45%)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        )}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
