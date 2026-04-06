"use client";

import {
  ComposedChart,
  Area,
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
  const achievedLabel = mode === "cumulative" ? "Realizado Acumulado" : "Valor Diário";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="gradientRealizado" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#34594F" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#34594F" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradientMeta" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#C1D9D4" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#C1D9D4" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#C1D9D4" strokeOpacity={0.5} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateLabel}
          tick={{ fontSize: 11, fill: "#6D8C84" }}
          axisLine={{ stroke: "#C1D9D4" }}
          tickLine={{ stroke: "#C1D9D4" }}
        />
        <YAxis
          tickFormatter={(v: number) => formatValue(v, kpiType)}
          tick={{ fontSize: 11, fill: "#6D8C84" }}
          axisLine={{ stroke: "#C1D9D4" }}
          tickLine={{ stroke: "#C1D9D4" }}
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
            border: "1px solid #C1D9D4",
            backgroundColor: "#FFFFFF",
            color: "#112622",
            boxShadow: "0 4px 12px rgba(17, 38, 34, 0.08)",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", color: "#6D8C84" }}
        />

        {/* Meta projetada - area com gradiente claro (render first = behind) */}
        {mode === "cumulative" && (
          <Area
            type="monotone"
            dataKey="projectedTarget"
            name="Meta Projetada"
            stroke="#6D8C84"
            strokeWidth={2}
            strokeDasharray="6 4"
            fill="url(#gradientMeta)"
            dot={false}
          />
        )}

        {/* Realizado - area com gradiente + linha sólida */}
        <Area
          type="monotone"
          dataKey={dataKey}
          name={achievedLabel}
          stroke="#214037"
          strokeWidth={2.5}
          fill="url(#gradientRealizado)"
          dot={{ r: 3, fill: "#214037", stroke: "#FFFFFF", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "#112622", stroke: "#FFFFFF", strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
