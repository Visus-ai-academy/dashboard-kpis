"use client";

import { KpiLineChart } from "./line-chart";
import { KpiBarChart } from "./bar-chart";
import { KpiAreaChart } from "./area-chart";

interface ChartDataPoint {
  date: string;
  value: number;
  cumulative: number;
  projectedTarget: number;
}

type ChartType = "LINE" | "BAR" | "AREA" | "PIE" | "RADIAL" | "STACKED_BAR";

interface ChartWrapperProps {
  chartType: ChartType;
  data: ChartDataPoint[];
  kpiType: string;
}

export function ChartWrapper({ chartType, data, kpiType }: ChartWrapperProps) {
  switch (chartType) {
    case "LINE":
      return <KpiLineChart data={data} kpiType={kpiType} mode="cumulative" />;
    case "BAR":
    case "STACKED_BAR":
      return <KpiBarChart data={data} kpiType={kpiType} />;
    case "AREA":
      return <KpiAreaChart data={data} kpiType={kpiType} />;
    case "PIE":
    case "RADIAL":
      // PIE and RADIAL require a different data shape (category-based, not time-series).
      // For now, fall back to bar chart for time-series data.
      return <KpiBarChart data={data} kpiType={kpiType} />;
    default:
      return <KpiLineChart data={data} kpiType={kpiType} mode="cumulative" />;
  }
}
