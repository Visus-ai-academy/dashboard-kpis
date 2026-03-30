"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatting";

interface ComparisonItem {
  kpiId: string;
  kpiName: string;
  kpiType: string;
  currentValue: number;
  previousValue: number;
  difference: number;
  percentageChange: number;
  target: number;
}

interface ComparisonData {
  comparison: ComparisonItem[];
  currentPeriod: { start: string; end: string };
  previousPeriod: { start: string; end: string };
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

export function PeriodComparison() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const kpiId = searchParams.get("kpiId");
  const sellerId = searchParams.get("sellerId");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const now = new Date();
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

        const params = new URLSearchParams({
          startDate: startDate ?? defaultStart,
          endDate: endDate ?? defaultEnd,
        });
        if (kpiId) params.set("kpiId", kpiId);
        if (sellerId) params.set("sellerId", sellerId);

        const res = await fetch(`/api/dashboard/comparison?${params}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [startDate, endDate, kpiId, sellerId]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-8 w-28" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data || data.comparison.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum dado de comparacao disponivel para o periodo selecionado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.comparison.map((item) => {
        const isPositive = item.difference > 0;
        const isNeutral = item.difference === 0;
        const maxValue = Math.max(item.currentValue, item.previousValue, 1);
        const currentBarWidth = (item.currentValue / maxValue) * 100;
        const previousBarWidth = (item.previousValue / maxValue) * 100;

        return (
          <Card key={item.kpiId}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {item.kpiName}
              </span>
              {isNeutral ? (
                <Minus className="size-4 text-muted-foreground" />
              ) : isPositive ? (
                <TrendingUp className="size-4 text-emerald-500" />
              ) : (
                <TrendingDown className="size-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Current period value */}
              <div>
                <p className="text-2xl font-bold">
                  {formatValue(item.currentValue, item.kpiType)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Anterior: {formatValue(item.previousValue, item.kpiType)}
                </p>
              </div>

              {/* Difference badge */}
              <div className="flex items-center gap-2">
                <Badge
                  variant={isNeutral ? "secondary" : "outline"}
                  className={
                    isPositive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                      : !isNeutral
                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                        : ""
                  }
                >
                  {isPositive ? "+" : ""}
                  {item.percentageChange}%
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {isPositive ? "+" : ""}
                  {formatValue(item.difference, item.kpiType)}
                </span>
              </div>

              {/* Comparison bars */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-12 text-[10px] text-muted-foreground">Atual</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${currentBarWidth}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12 text-[10px] text-muted-foreground">Anterior</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-muted-foreground/30 transition-all"
                      style={{ width: `${previousBarWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
