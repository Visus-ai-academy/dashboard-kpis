"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUnitFilter } from "@/lib/hooks/use-unit-filter";
import { Calendar, Target, TrendingUp, Hash } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatting";

interface DailyTargetData {
  kpiId: string;
  kpiName: string;
  kpiType: string;
  month: number;
  year: number;
  target: number;
  achieved: number;
  remaining: number;
  totalBusinessDays: number;
  remainingBusinessDays: number;
  dailyTarget: number;
  progressPercent: number;
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

export function DailyTarget() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<DailyTargetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const [includeSunday, setIncludeSunday] = useState(false);

  const kpiId = searchParams.get("kpiId");
  const sellerId = searchParams.get("sellerId");
  const unitId = useUnitFilter();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (kpiId) params.set("kpiId", kpiId);
        if (sellerId) params.set("sellerId", sellerId);
        if (unitId) params.set("unitId", unitId);
        params.set("includeSaturday", String(includeSaturday));
        params.set("includeSunday", String(includeSunday));

        const res = await fetch(`/api/dashboard/daily-target?${params}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [kpiId, sellerId, unitId, includeSaturday, includeSunday]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Configure um KPI primário para visualizar a meta diária.
        </CardContent>
      </Card>
    );
  }

  const progressClamped = Math.min(data.progressPercent, 100);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h3 className="font-semibold">{data.kpiName}</h3>
          <p className="text-sm text-muted-foreground">Meta Diária</p>
        </div>
        <div className="flex items-center gap-1">
          <Toggle
            variant="outline"
            size="sm"
            pressed={includeSaturday}
            onPressedChange={setIncludeSaturday}
            aria-label="Incluir sábados"
          >
            Sab
          </Toggle>
          <Toggle
            variant="outline"
            size="sm"
            pressed={includeSunday}
            onPressedChange={setIncludeSunday}
            aria-label="Incluir domingos"
          >
            Dom
          </Toggle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Remaining days */}
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {data.remainingBusinessDays} dias úteis restantes
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso do mês</span>
            <span>{data.progressPercent}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                data.progressPercent >= 100
                  ? "bg-emerald-500"
                  : data.progressPercent >= 50
                    ? "bg-primary"
                    : "bg-amber-500"
              }`}
              style={{ width: `${progressClamped}%` }}
            />
          </div>
        </div>

        {/* Mini cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniCard
            icon={<Target className="size-4" />}
            label="Meta do Mês"
            value={formatValue(data.target, data.kpiType)}
          />
          <MiniCard
            icon={<TrendingUp className="size-4" />}
            label="Realizado"
            value={formatValue(data.achieved, data.kpiType)}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <MiniCard
            icon={<Hash className="size-4" />}
            label="Restante"
            value={formatValue(data.remaining, data.kpiType)}
            valueClassName={data.remaining > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}
          />
          <MiniCard
            icon={<Calendar className="size-4" />}
            label="Meta Diária"
            value={formatValue(data.dailyTarget, data.kpiType)}
            sublabel="por dia útil"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniCard({
  icon,
  label,
  value,
  sublabel,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-lg font-bold ${valueClassName ?? ""}`}>{value}</p>
      {sublabel && (
        <p className="text-[10px] text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}
