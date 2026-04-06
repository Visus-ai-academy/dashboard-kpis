"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUnitFilter } from "@/lib/hooks/use-unit-filter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/formatting";

interface HeatmapDayData {
  dayIndex: number;
  dayLabel: string;
  average: number;
  total: number;
  count: number;
}

/**
 * Green scale from the Visus branding palette:
 * #C1D9D4 (lightest) -> #6D8C84 -> #34594F -> #214037 -> #112622 (darkest)
 */
const GREEN_SCALE = [
  "#e8f0ee", // near-white for zero/very low
  "#C1D9D4", // verde-menta
  "#8fb5ab", // interpolated
  "#6D8C84", // verde-salvia
  "#4f7269", // interpolated
  "#34594F", // verde-musgo
  "#214037", // verde-petroleo
  "#112622", // verde-profundo
];

function getColor(value: number, maxValue: number): string {
  if (value === 0 || maxValue === 0) return GREEN_SCALE[0];
  const ratio = value / maxValue;
  const index = Math.min(
    GREEN_SCALE.length - 1,
    Math.max(1, Math.round(ratio * (GREEN_SCALE.length - 1)))
  );
  return GREEN_SCALE[index];
}

function getTextColor(value: number, maxValue: number): string {
  if (maxValue === 0) return "#112622";
  const ratio = value / maxValue;
  return ratio > 0.45 ? "#FFFFFF" : "#112622";
}

export function HeatmapWeek() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<HeatmapDayData[]>([]);
  const [loading, setLoading] = useState(true);

  const sellerId = searchParams.get("sellerId");
  const unitId = useUnitFilter();

  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams();
        if (sellerId) params.set("sellerId", sellerId);
        if (unitId) params.set("unitId", unitId);
        const res = await fetch(`/api/dashboard/heatmap-week?${params}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data.heatmapData);
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
        <CardContent className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0 || data.every((d) => d.average === 0)) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium">Vendas por Dia da Semana</h3>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum dado de vendas encontrado nos últimos 6 meses
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxAverage = Math.max(...data.map((d) => d.average));

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-medium">Vendas por Dia da Semana</h3>
        <p className="text-xs text-muted-foreground">
          Média de vendas por dia (últimos 6 meses)
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((day) => {
          const barWidth = maxAverage > 0 ? (day.average / maxAverage) * 100 : 0;
          const bgColor = getColor(day.average, maxAverage);
          const textColor = getTextColor(day.average, maxAverage);

          return (
            <div key={day.dayIndex} className="flex items-center gap-3">
              <span className="w-10 text-xs font-medium text-muted-foreground">
                {day.dayLabel}
              </span>
              <div className="flex-1 relative">
                <div className="h-9 w-full rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-md flex items-center justify-end pr-3 transition-all duration-500"
                    style={{
                      width: `${Math.max(barWidth, day.average > 0 ? 15 : 0)}%`,
                      backgroundColor: bgColor,
                    }}
                  >
                    {day.average > 0 && (
                      <span
                        className="text-xs font-semibold whitespace-nowrap"
                        style={{ color: textColor }}
                      >
                        {formatCurrency(day.average)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
