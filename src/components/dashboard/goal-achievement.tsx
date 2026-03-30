"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatting";

interface GoalItem {
  kpiId: string;
  kpiName: string;
  kpiType: string;
  achieved: number;
  target: number;
  percentage: number;
  met: boolean;
}

interface GoalData {
  goals: GoalItem[];
  totalGoals: number;
  metCount: number;
  overallPercentage: number;
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

export function GoalAchievement() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
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
        if (sellerId) params.set("sellerId", sellerId);

        const res = await fetch(`/api/dashboard/goal-achievement?${params}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [startDate, endDate, sellerId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-24 mx-auto" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Atingimento de Metas</h3>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          Nenhuma meta encontrada.
        </CardContent>
      </Card>
    );
  }

  const overallColor = data.overallPercentage >= 100
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-foreground";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Trophy className="size-5 text-amber-500" />
        <div>
          <h3 className="font-semibold">Atingimento de Metas</h3>
          <p className="text-xs text-muted-foreground">
            {data.metCount} de {data.totalGoals} metas atingidas
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall percentage */}
        <div className="text-center">
          <p className={`text-4xl font-bold ${overallColor}`}>
            {data.overallPercentage}%
          </p>
          <p className="text-xs text-muted-foreground">
            Atingimento geral
          </p>
        </div>

        {/* Individual goals */}
        <div className="space-y-3">
          {data.goals.map((goal) => (
            <div key={goal.kpiId} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{goal.kpiName}</span>
                <Badge
                  variant={goal.met ? "default" : "secondary"}
                  className={
                    goal.met
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  }
                >
                  {goal.met ? "Meta atingida" : "Abaixo"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {formatValue(goal.achieved, goal.kpiType)} / {formatValue(goal.target, goal.kpiType)}
                </span>
                <span>{goal.percentage}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    goal.met ? "bg-emerald-500" : "bg-red-400"
                  }`}
                  style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
