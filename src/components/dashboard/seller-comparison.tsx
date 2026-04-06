"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUnitFilter } from "@/lib/hooks/use-unit-filter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils/formatting";

interface ComparisonItem {
  sellerId: string;
  sellerName: string;
  totalSales: number;
  saleCount: number;
  averageTicket: number;
  percentVsAverage: number;
}

interface ComparisonData {
  comparison: ComparisonItem[];
  companyAverageTicket: number;
}

export function SellerComparison() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
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
        if (unitId) params.set("unitId", unitId);

        const res = await fetch(`/api/dashboard/seller-comparison?${params}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [startDate, endDate, unitId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.comparison.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Comparativo de Vendedores</h3>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          Nenhuma venda encontrada no periodo.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">Comparativo de Vendedores</h3>
        <p className="text-xs text-muted-foreground">
          Ticket médio da empresa: {formatCurrency(data.companyAverageTicket)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.comparison.map((item, index) => {
            const isAboveAverage = item.percentVsAverage > 0;
            const isNeutral = item.percentVsAverage === 0;

            return (
              <div
                key={item.sellerId}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                {/* Position */}
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                  {index + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">
                      {item.sellerName}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        isNeutral
                          ? ""
                          : isAboveAverage
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                            : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                      }
                    >
                      {isAboveAverage ? "+" : ""}
                      {item.percentVsAverage}% vs média
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Vendas: {formatNumber(item.saleCount)}</span>
                    <span>Total: {formatCurrency(item.totalSales)}</span>
                    <span>Ticket médio: {formatCurrency(item.averageTicket)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
