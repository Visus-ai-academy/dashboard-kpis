"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercentage, formatNumber } from "@/lib/utils/formatting";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface EntryRow {
  id: string;
  kpiId: string;
  kpiName: string;
  kpiType: string;
  sellerId: string;
  sellerName: string;
  value: number;
  entryDate: string;
  notes: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Seller {
  id: string;
  name: string;
}

interface Kpi {
  id: string;
  name: string;
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export default function EntriesHistoryPage() {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);

  // Filters
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSellerId, setFilterSellerId] = useState("");
  const [filterKpiId, setFilterKpiId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ──────────── Load filter options ────────────
  useEffect(() => {
    async function loadOptions() {
      try {
        const [sellersRes, kpisRes] = await Promise.all([
          fetch("/api/sellers"),
          fetch("/api/kpis"),
        ]);
        const [sellersJson, kpisJson] = await Promise.all([
          sellersRes.json(),
          kpisRes.json(),
        ]);
        if (sellersJson.success) setSellers(sellersJson.data);
        if (kpisJson.success) setKpis(kpisJson.data);
      } catch {
        toast.error("Erro ao carregar filtros");
      }
    }
    loadOptions();
  }, []);

  // ──────────── Fetch entries ────────────
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("pageSize", "20");
      if (filterStartDate) params.set("startDate", filterStartDate);
      if (filterEndDate) params.set("endDate", filterEndDate);
      if (filterSellerId) params.set("sellerId", filterSellerId);
      if (filterKpiId) params.set("kpiId", filterKpiId);

      const res = await fetch(`/api/entries?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data.entries);
        setPagination(json.data.pagination);
      } else {
        toast.error(json.error?.message ?? "Erro ao carregar lançamentos");
      }
    } catch {
      toast.error("Erro ao carregar lançamentos");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStartDate, filterEndDate, filterSellerId, filterKpiId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function handleSearch() {
    setCurrentPage(1);
    fetchEntries();
  }

  function clearFilters() {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterSellerId("");
    setFilterKpiId("");
    setCurrentPage(1);
  }

  function formatValue(type: string, value: number): string {
    switch (type) {
      case "MONETARY":
        return formatCurrency(value);
      case "PERCENTAGE":
        return formatPercentage(value);
      default:
        return formatNumber(value);
    }
  }

  function formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // ──────────── Render ────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Histórico de Lançamentos
        </h1>
        <p className="text-muted-foreground">
          Consulte todos os lançamentos de dados realizados
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border p-4 space-y-4">
        <h2 className="text-sm font-semibold">Filtros</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="filter-start" className="text-xs">
              Data Início
            </Label>
            <Input
              id="filter-start"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-end" className="text-xs">
              Data Fim
            </Label>
            <Input
              id="filter-end"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vendedor</Label>
            <Select
              value={filterSellerId}
              onValueChange={(v) => setFilterSellerId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <span className="flex flex-1 text-left truncate">
                  {filterSellerId
                    ? sellers.find((s) => s.id === filterSellerId)?.name ?? "Selecione"
                    : "Todos"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">KPI</Label>
            <Select
              value={filterKpiId}
              onValueChange={(v) => setFilterKpiId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <span className="flex flex-1 text-left truncate">
                  {filterKpiId
                    ? kpis.find((k) => k.id === filterKpiId)?.name ?? "Selecione"
                    : "Todos"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {kpis.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSearch}>
            <Search className="size-3.5" data-icon="inline-start" />
            Buscar
          </Button>
          <Button size="sm" variant="outline" onClick={clearFilters}>
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>KPI</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Horário do Lançamento</TableHead>
              <TableHead>Observações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  Nenhum lançamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {formatDate(entry.entryDate)}
                  </TableCell>
                  <TableCell>{entry.sellerName}</TableCell>
                  <TableCell>{entry.kpiName}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatValue(entry.kpiType, entry.value)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                    {entry.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
            {pagination.total} lançamentos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-sm font-medium">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() =>
                setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={currentPage === pagination.totalPages}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
