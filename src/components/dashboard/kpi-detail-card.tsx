"use client";

import { Hash } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatting";

interface KpiDetailCardProps {
  kpiName: string;
  kpiType: string;
  achieved: number;
  target: number;
  percentage: number;
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

export function KpiDetailCard({
  kpiName,
  kpiType,
  achieved,
  target,
  percentage,
}: KpiDetailCardProps) {
  const progressClamped = Math.min(percentage, 100);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <span className="text-sm font-medium text-muted-foreground truncate">
          {kpiName}
        </span>
        <Hash className="size-4 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <p className="text-2xl font-bold">{formatValue(achieved, kpiType)}</p>
          <p className="text-xs text-muted-foreground">
            Meta: {formatValue(target, kpiType)}
          </p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span>{percentage}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percentage >= 100
                  ? "bg-emerald-500"
                  : percentage >= 50
                    ? "bg-primary"
                    : "bg-amber-500"
              }`}
              style={{ width: `${progressClamped}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
