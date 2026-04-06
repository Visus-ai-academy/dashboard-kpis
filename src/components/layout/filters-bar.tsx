"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useUnitFilter } from "@/lib/hooks/use-unit-filter";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

interface Kpi {
  id: string;
  name: string;
}

interface Seller {
  id: string;
  name: string;
}

function getMonthRange(offset: number): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const d = new Date(year, month, 1);
  const startStr = d.toISOString().split("T")[0];
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const endStr = lastDay.toISOString().split("T")[0];
  return { start: startStr, end: endStr };
}

export function FiltersBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const unitId = useUnitFilter();

  // Read initial values from URL
  const currentMonth = getMonthRange(0);
  const startDate = searchParams.get("startDate") ?? currentMonth.start;
  const endDate = searchParams.get("endDate") ?? currentMonth.end;
  const kpiId = searchParams.get("kpiId") ?? "";
  const sellerId = searchParams.get("sellerId") ?? "";

  // Local state for inputs
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  useEffect(() => {
    setLocalStart(startDate);
  }, [startDate]);

  useEffect(() => {
    setLocalEnd(endDate);
  }, [endDate]);

  // Fetch KPIs and Sellers
  useEffect(() => {
    async function fetchOptions() {
      try {
        const sellersUrl = unitId
          ? `/api/sellers?unitId=${unitId}`
          : "/api/sellers";
        const [kpisRes, sellersRes] = await Promise.all([
          fetch("/api/kpis"),
          fetch(sellersUrl),
        ]);
        const [kpisJson, sellersJson] = await Promise.all([
          kpisRes.json(),
          sellersRes.json(),
        ]);
        if (kpisJson.success) setKpis(kpisJson.data);
        if (sellersJson.success) setSellers(sellersJson.data);
      } catch {
        // silently fail - filters will just be empty
      }
    }
    fetchOptions();
  }, [unitId]);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  function applyDateRange(start: string, end: string) {
    updateParams({ startDate: start, endDate: end });
  }

  function handleCurrentMonth() {
    const range = getMonthRange(0);
    setLocalStart(range.start);
    setLocalEnd(range.end);
    applyDateRange(range.start, range.end);
  }

  function handlePreviousMonth() {
    const range = getMonthRange(-1);
    setLocalStart(range.start);
    setLocalEnd(range.end);
    applyDateRange(range.start, range.end);
  }

  function handleDateBlur() {
    if (localStart && localEnd) {
      applyDateRange(localStart, localEnd);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-end gap-4">
        {/* Date Range */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Data Início</Label>
          <Input
            type="date"
            className="h-8 w-[140px] text-sm"
            value={localStart}
            onChange={(e) => setLocalStart(e.target.value)}
            onBlur={handleDateBlur}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Data Fim</Label>
          <Input
            type="date"
            className="h-8 w-[140px] text-sm"
            value={localEnd}
            onChange={(e) => setLocalEnd(e.target.value)}
            onBlur={handleDateBlur}
          />
        </div>

        {/* Quick date buttons */}
        <div className="space-y-1">
          <Label className="text-xs text-transparent select-none">-</Label>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleCurrentMonth}
            >
              <CalendarDays className="mr-1 size-3" />
              Mês Atual
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handlePreviousMonth}
            >
              <CalendarDays className="mr-1 size-3" />
              Mês Anterior
            </Button>
          </div>
        </div>

        {/* KPI Select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">KPI</Label>
          <Select
            value={kpiId || "__all__"}
            onValueChange={(v) => v !== null && updateParams({ kpiId: v === "__all__" ? "" : v })}
          >
            <SelectTrigger className="h-8 w-[180px]">
              <span className="flex flex-1 text-left truncate">
                {kpiId ? (kpis.find((k) => k.id === kpiId)?.name ?? "Todos os KPIs") : "Todos os KPIs"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os KPIs</SelectItem>
              {kpis.map((kpi) => (
                <SelectItem key={kpi.id} value={kpi.id}>
                  {kpi.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seller Select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Vendedor</Label>
          <Select
            value={sellerId || "__all__"}
            onValueChange={(v) => v !== null && updateParams({ sellerId: v === "__all__" ? "" : v })}
          >
            <SelectTrigger className="h-8 w-[180px]">
              <span className="flex flex-1 text-left truncate">
                {sellerId ? (sellers.find((s) => s.id === sellerId)?.name ?? "Todos os vendedores") : "Todos os vendedores"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os vendedores</SelectItem>
              {sellers.map((seller) => (
                <SelectItem key={seller.id} value={seller.id}>
                  {seller.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
