"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUnitFilter } from "@/lib/hooks/use-unit-filter";
import { Users, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { KpiLineChart } from "@/components/charts/line-chart";
import { SellerComparisonChart } from "@/components/charts/seller-comparison-chart";

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

interface SellerChartData {
  kpiId: string;
  kpiName: string;
  kpiType: string;
  targetValue: number;
  sellerData: { name: string; value: number }[];
}

interface GoalItem {
  kpiId: string;
  kpiName: string;
  kpiType: string;
}

type ViewMode = "general" | "by-seller";

export function KpiChartsSection() {
  const searchParams = useSearchParams();
  const [charts, setCharts] = useState<KpiChartData[]>([]);
  const [sellerCharts, setSellerCharts] = useState<SellerChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("general");

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

        const start = startDate ?? defaultStart;
        const end = endDate ?? defaultEnd;

        // Get all active KPIs
        const goalsParams = new URLSearchParams({ startDate: start, endDate: end });
        if (sellerId) goalsParams.set("sellerId", sellerId);
        if (unitId) goalsParams.set("unitId", unitId);

        const goalsRes = await fetch(`/api/dashboard/goal-achievement?${goalsParams}`);
        const goalsJson = await goalsRes.json();

        if (!goalsJson.success) {
          setCharts([]);
          setSellerCharts([]);
          return;
        }

        const kpis: GoalItem[] = goalsJson.data.goals;

        // Fetch both general and by-seller data in parallel
        const [generalResults, sellerResults] = await Promise.all([
          // General charts
          Promise.all(
            kpis.map(async (kpi) => {
              const params = new URLSearchParams({
                startDate: start,
                endDate: end,
                kpiId: kpi.kpiId,
              });
              if (sellerId) params.set("sellerId", sellerId);
              if (unitId) params.set("unitId", unitId);
              const res = await fetch(`/api/dashboard/chart-data?${params}`);
              const json = await res.json();
              if (json.success) return json.data as KpiChartData;
              return null;
            })
          ),
          // By-seller charts
          Promise.all(
            kpis.map(async (kpi) => {
              const params = new URLSearchParams({
                startDate: start,
                endDate: end,
                kpiId: kpi.kpiId,
              });
              if (unitId) params.set("unitId", unitId);
              const res = await fetch(`/api/dashboard/chart-by-seller?${params}`);
              const json = await res.json();
              if (json.success) return json.data as SellerChartData;
              return null;
            })
          ),
        ]);

        setCharts(generalResults.filter((r): r is KpiChartData => r !== null));
        setSellerCharts(sellerResults.filter((r): r is SellerChartData => r !== null));
      } catch {
        setCharts([]);
        setSellerCharts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [startDate, endDate, sellerId, unitId]);

  const activeCharts = viewMode === "general" ? charts : sellerCharts;

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex items-center gap-1 rounded-lg border border-[#C1D9D4] p-1 w-fit">
        <Button
          variant={viewMode === "general" ? "default" : "ghost"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setViewMode("general")}
        >
          <BarChart3 className="mr-1.5 size-3.5" />
          Geral
        </Button>
        <Button
          variant={viewMode === "by-seller" ? "default" : "ghost"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setViewMode("by-seller")}
        >
          <Users className="mr-1.5 size-3.5" />
          Por Vendedor
        </Button>
      </div>

      {/* Charts */}
      {loading ? (
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
      ) : activeCharts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Sem dados para exibir no período selecionado
          </CardContent>
        </Card>
      ) : viewMode === "general" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {charts.map((chart, index) => (
            <Card key={chart.kpiId} className={charts.length % 2 === 1 && index === charts.length - 1 ? "lg:col-span-2" : ""}>
              <CardHeader>
                <h3 className="text-sm font-medium">{chart.kpiName}</h3>
              </CardHeader>
              <CardContent>
                <KpiLineChart
                  data={chart.dailyData}
                  kpiType={chart.kpiType}
                  mode="cumulative"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {sellerCharts.map((chart, index) => (
            <Card key={chart.kpiId} className={sellerCharts.length % 2 === 1 && index === sellerCharts.length - 1 ? "lg:col-span-2" : ""}>
              <CardHeader>
                <h3 className="text-sm font-medium">{chart.kpiName}</h3>
              </CardHeader>
              <CardContent>
                <SellerComparisonChart
                  data={chart.sellerData}
                  kpiType={chart.kpiType}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
