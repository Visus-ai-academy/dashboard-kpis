"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUnitFilter } from "@/lib/hooks/use-unit-filter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercentage } from "@/lib/utils/formatting";
import { Receipt, TrendingUp } from "lucide-react";

interface DerivedKpi {
  id: string;
  name: string;
  type: string;
  value: number;
  description: string;
}

function formatValue(value: number, type: string): string {
  switch (type) {
    case "MONETARY":
      return formatCurrency(value);
    case "PERCENTAGE":
      return formatPercentage(value);
    default:
      return String(value);
  }
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "derived-average-ticket": Receipt,
  "derived-conversion-rate": TrendingUp,
};

export function DerivedKpis() {
  const searchParams = useSearchParams();
  const [kpis, setKpis] = useState<DerivedKpi[]>([]);
  const [loading, setLoading] = useState(true);

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const sellerId = searchParams.get("sellerId");
  const unitId = useUnitFilter();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const now = new Date();
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];

        const params = new URLSearchParams({
          startDate: startDate ?? defaultStart,
          endDate: endDate ?? defaultEnd,
        });
        if (sellerId) params.set("sellerId", sellerId);
        if (unitId) params.set("unitId", unitId);

        const res = await fetch(`/api/dashboard/derived-kpis?${params}`);
        const json = await res.json();
        if (json.success) {
          setKpis(json.data.derivedKpis);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [startDate, endDate, sellerId, unitId]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
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

  if (kpis.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = ICONS[kpi.id] ?? Receipt;
        return (
          <Card key={kpi.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {kpi.name}
              </span>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatValue(kpi.value, kpi.type)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
