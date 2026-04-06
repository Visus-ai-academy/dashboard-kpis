"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUnitFilter } from "@/lib/hooks/use-unit-filter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatting";

interface RankingItem {
  sellerId: string;
  sellerName: string;
  achieved: number;
  target: number;
  remaining: number;
  dailyTarget: number;
  percentage: number;
}

interface RankingData {
  kpiId: string;
  kpiName: string;
  kpiType: string;
  ranking: RankingItem[];
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

function getBarColor(percentage: number): string {
  if (percentage >= 80) return "bg-emerald-500";
  if (percentage >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function SellerRanking() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const kpiId = searchParams.get("kpiId");
  const unitId = useUnitFilter();

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
        if (unitId) params.set("unitId", unitId);

        const res = await fetch(`/api/dashboard/ranking?${params}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [startDate, endDate, kpiId, unitId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.ranking.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Ranking de Vendedores</h3>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          Nenhum vendedor encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">Ranking - {data.kpiName}</h3>
        <p className="text-xs text-muted-foreground">Ordenado por valor realizado</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.ranking.map((item, index) => (
          <div
            key={item.sellerId}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            {/* Position */}
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
              {index + 1}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{item.sellerName}</span>
                <span className="text-xs font-semibold ml-2 whitespace-nowrap">
                  {item.percentage}%
                </span>
              </div>

              {/* Mini info */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                <span>Meta: {formatValue(item.target, data.kpiType)}</span>
                <span>Real: {formatValue(item.achieved, data.kpiType)}</span>
                <span>Rest: {formatValue(item.remaining, data.kpiType)}</span>
                <span>Diario: {formatValue(item.dailyTarget, data.kpiType)}</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getBarColor(item.percentage)}`}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
