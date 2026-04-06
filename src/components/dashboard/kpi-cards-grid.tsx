"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUnitFilter } from "@/lib/hooks/use-unit-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { KpiDetailCard } from "./kpi-detail-card";

interface GoalItem {
  kpiId: string;
  kpiName: string;
  kpiType: string;
  achieved: number;
  target: number;
  percentage: number;
  met: boolean;
}

export function KpiCardsGrid() {
  const searchParams = useSearchParams();
  const [goals, setGoals] = useState<GoalItem[]>([]);
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
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

        const params = new URLSearchParams({
          startDate: startDate ?? defaultStart,
          endDate: endDate ?? defaultEnd,
        });
        if (sellerId) params.set("sellerId", sellerId);
        if (unitId) params.set("unitId", unitId);

        const res = await fetch(`/api/dashboard/goal-achievement?${params}`);
        const json = await res.json();
        if (json.success) setGoals(json.data.goals);
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-7 w-20" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (goals.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-4">
      {goals.map((goal) => (
        <div key={goal.kpiId} className="flex-1 min-w-[250px]">
          <KpiDetailCard
            kpiName={goal.kpiName}
            kpiType={goal.kpiType}
            achieved={goal.achieved}
            target={goal.target}
            percentage={goal.percentage}
          />
        </div>
      ))}
    </div>
  );
}
