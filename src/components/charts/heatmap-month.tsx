"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUnitFilter } from "@/lib/hooks/use-unit-filter";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/formatting";

interface GridRow {
  day: number;
  cells: { value: number }[];
}

interface ChartDataPoint {
  day: string;
  value: number;
}

export function HeatmapMonth() {
  const searchParams = useSearchParams();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const sellerId = searchParams.get("sellerId");
  const unitId = useUnitFilter();

  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams();
        if (sellerId) params.set("sellerId", sellerId);
        if (unitId) params.set("unitId", unitId);
        const res = await fetch(`/api/dashboard/heatmap-month?${params}`);
        const json = await res.json();
        if (json.success) {
          const grid: GridRow[] = json.data.grid;

          // Sum all months for each day to get total per day of month
          const data: ChartDataPoint[] = grid
            .map((row) => ({
              day: String(row.day),
              value: row.cells.reduce((sum, c) => sum + c.value, 0),
            }))
            .filter((d) => d.value > 0);

          setChartData(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [sellerId, unitId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium">Vendas por Dia do Mês</h3>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum dado de vendas encontrado nos últimos 6 meses
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-medium">Vendas por Dia do Mês</h3>
        <p className="text-xs text-muted-foreground">
          Total de vendas por dia (últimos 6 meses)
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsBarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C1D9D4" strokeOpacity={0.5} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "#6D8C84" }}
              axisLine={{ stroke: "#C1D9D4" }}
              tickLine={{ stroke: "#C1D9D4" }}
            />
            <YAxis
              tickFormatter={(v: number) => formatCurrency(v)}
              tick={{ fontSize: 10, fill: "#6D8C84" }}
              axisLine={{ stroke: "#C1D9D4" }}
              tickLine={{ stroke: "#C1D9D4" }}
              width={80}
            />
            <Tooltip
              formatter={(value: unknown) => [formatCurrency(Number(value)), "Total"]}
              labelFormatter={(label: unknown) => `Dia ${label}`}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #C1D9D4",
                backgroundColor: "#FFFFFF",
                color: "#112622",
                boxShadow: "0 4px 12px rgba(17, 38, 34, 0.08)",
              }}
            />
            <Bar
              dataKey="value"
              fill="#34594F"
              radius={[3, 3, 0, 0]}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
