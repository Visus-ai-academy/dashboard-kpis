"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatting";

interface SellerDataPoint {
  name: string;
  value: number;
}

interface SellerComparisonChartProps {
  data: SellerDataPoint[];
  kpiType: string;
}

const BAR_COLORS = [
  "#112622",
  "#214037",
  "#34594F",
  "#6D8C84",
  "#C1D9D4",
  "#8FB5AC",
  "#4A7268",
  "#2D534A",
];

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

export function SellerComparisonChart({ data, kpiType }: SellerComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Sem dados para exibir
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart
        data={data}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        layout="horizontal"
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          interval={0}
          angle={data.length > 5 ? -30 : 0}
          textAnchor={data.length > 5 ? "end" : "middle"}
          height={data.length > 5 ? 60 : 30}
        />
        <YAxis
          tickFormatter={(v: number) => formatValue(v, kpiType)}
          tick={{ fontSize: 11 }}
          width={80}
        />
        <Tooltip
          formatter={(value: unknown) => [formatValue(Number(value), kpiType), "Valor"]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #C1D9D4",
            backgroundColor: "#FFFFFF",
            color: "#112622",
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
