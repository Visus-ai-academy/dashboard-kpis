"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartWrapper } from "@/components/charts/chart-wrapper";

type ChartType = "LINE" | "BAR" | "AREA" | "PIE" | "RADIAL" | "STACKED_BAR";

interface ChartDataPoint {
  date: string;
  value: number;
  cumulative: number;
  projectedTarget: number;
}

interface KpiChartData {
  kpiId: string;
  kpiName: string;
  kpiType: string;
  chartType: ChartType;
  targetValue: number;
  dailyData: ChartDataPoint[];
}

interface GoalItem {
  kpiId: string;
  kpiName: string;
  kpiType: string;
}

export function KpiChartsSection() {
  const searchParams = useSearchParams();
  const [charts, setCharts] = useState<KpiChartData[]>([]);
  const [loading, setLoading] = useState(true);

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const sellerId = searchParams.get("sellerId");

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

        const start = startDate ?? defaultStart;
        const end = endDate ?? defaultEnd;

        // First get all active KPIs from goal-achievement endpoint
        const goalsParams = new URLSearchParams({ startDate: start, endDate: end });
        if (sellerId) goalsParams.set("sellerId", sellerId);

        const goalsRes = await fetch(`/api/dashboard/goal-achievement?${goalsParams}`);
        const goalsJson = await goalsRes.json();

        if (!goalsJson.success) {
          setCharts([]);
          return;
        }

        const kpis: GoalItem[] = goalsJson.data.goals;

        // Fetch chart data for each KPI in parallel
        const chartPromises = kpis.map(async (kpi) => {
          const params = new URLSearchParams({
            startDate: start,
            endDate: end,
            kpiId: kpi.kpiId,
          });
          if (sellerId) params.set("sellerId", sellerId);

          const res = await fetch(`/api/dashboard/chart-data?${params}`);
          const json = await res.json();
          if (json.success) return json.data as KpiChartData;
          return null;
        });

        const results = await Promise.all(chartPromises);
        setCharts(results.filter((r): r is KpiChartData => r !== null));
      } catch {
        setCharts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [startDate, endDate, sellerId]);

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (charts.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {charts.map((chart) => (
        <Card key={chart.kpiId}>
          <CardHeader>
            <h3 className="text-sm font-medium">{chart.kpiName}</h3>
          </CardHeader>
          <CardContent>
            <ChartWrapper
              chartType={chart.chartType}
              data={chart.dailyData}
              kpiType={chart.kpiType}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
