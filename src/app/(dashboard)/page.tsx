import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FiltersBar } from "@/components/layout/filters-bar";
import { PeriodComparison } from "@/components/dashboard/period-comparison";
import { DailyTarget } from "@/components/dashboard/daily-target";
import { SellerRanking } from "@/components/dashboard/seller-ranking";
import { SellerComparison } from "@/components/dashboard/seller-comparison";
import { GoalAchievement } from "@/components/dashboard/goal-achievement";
import { KpiCardsGrid } from "@/components/dashboard/kpi-cards-grid";
import { KpiChartsSection } from "@/components/dashboard/kpi-charts-section";
import { RankingWidget } from "@/components/gamification/ranking-widget";
import { DerivedKpis } from "@/components/dashboard/derived-kpis";
import { HeatmapWeek } from "@/components/charts/heatmap-week";
import { HeatmapMonth } from "@/components/charts/heatmap-month";

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral dos seus KPIs e metas
        </p>
      </div>

      {/* Filters */}
      <Suspense fallback={<Skeleton className="h-16 w-full" />}>
        <FiltersBar />
      </Suspense>

      {/* Period Comparison - top row */}
      <Suspense
        fallback={
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
        }
      >
        <PeriodComparison />
      </Suspense>

      {/* Daily Target */}
      <Suspense fallback={<SectionSkeleton rows={4} />}>
        <DailyTarget />
      </Suspense>

      {/* Middle row: Ranking + Seller Comparison + Goal Achievement */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Suspense fallback={<SectionSkeleton rows={5} />}>
          <SellerRanking />
        </Suspense>

        <Suspense fallback={<SectionSkeleton rows={5} />}>
          <SellerComparison />
        </Suspense>

        <Suspense fallback={<SectionSkeleton rows={4} />}>
          <GoalAchievement />
        </Suspense>
      </div>

      {/* Gamification Ranking */}
      <Suspense fallback={<SectionSkeleton rows={5} />}>
        <RankingWidget />
      </Suspense>

      {/* Derived KPIs */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Indicadores Derivados</h2>
        <Suspense
          fallback={
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
          }
        >
          <DerivedKpis />
        </Suspense>
      </div>

      {/* Heatmaps */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Análise de Vendas</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Suspense
            fallback={
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-56" />
                </CardHeader>
                <CardContent className="space-y-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </CardContent>
              </Card>
            }
          >
            <HeatmapWeek />
          </Suspense>
          <Suspense
            fallback={
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-56" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[400px] w-full" />
                </CardContent>
              </Card>
            }
          >
            <HeatmapMonth />
          </Suspense>
        </div>
      </div>

      {/* KPI Charts */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Gráficos de KPIs</h2>
        <Suspense
          fallback={
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
          }
        >
          <KpiChartsSection />
        </Suspense>
      </div>

      {/* KPI Cards Grid - bottom */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Detalhamento por KPI</h2>
        <Suspense
          fallback={
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
          }
        >
          <KpiCardsGrid />
        </Suspense>
      </div>
    </div>
  );
}
