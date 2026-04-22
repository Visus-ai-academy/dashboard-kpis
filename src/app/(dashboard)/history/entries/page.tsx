"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
  clientId: string | null;
  clientName: string | null;
  value: number;
  entryDate: string;
  notes: string | null;
  maturityLevel: string | null;
  temperature: string | null;
  scheduledDate: string | null;
  createdAt: string;
}

const MATURITY_LABELS: Record<string, string> = {
  INITIAL: "Inicial",
  DEVELOPING: "Em Desenvolvimento",
  MATURE: "Maduro",
  CLOSING: "Fechamento",
};

const TEMPERATURE_LABELS: Record<string, string> = {
  COLD: "Frio",
  WARM: "Morno",
  HOT: "Quente",
};

const TEMPERATURE_COLORS: Record<string, string> = {
  COLD: "text-blue-600 bg-blue-50",
  WARM: "text-amber-600 bg-amber-50",
  HOT: "text-red-600 bg-red-50",
};

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
  type: string;
}

interface Client {
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
  const [clients, setClients] = useState<Client[]>([]);

  // Filters
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSellerId, setFilterSellerId] = useState("");
  const [filterKpiId, setFilterKpiId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EntryRow | null>(null);
  const [formSellerId, setFormSellerId] = useState("");
  const [formKpiId, setFormKpiId] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formMaturityLevel, setFormMaturityLevel] = useState("");
  const [formTemperature, setFormTemperature] = useState("");
  const [formScheduledDate, setFormScheduledDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // ──────────── Derived state: selected KPI name ────────────
  const selectedKpi = kpis.find((k) => k.id === formKpiId);
  const selectedKpiName = selectedKpi?.name ?? "";
  const showMaturityLevel = /liga/i.test(selectedKpiName);
  const showTemperature = /reuni/i.test(selectedKpiName);

  // ──────────── Value label based on KPI ────────────
  const selectedKpiType = selectedKpi?.type ?? "NUMERIC";
  const valueLabel = selectedKpiType === "MONETARY"
    ? "Valor (R$) *"
    : selectedKpiType === "PERCENTAGE"
      ? "Valor (%) *"
      : showMaturityLevel
        ? "Ligações *"
        : showTemperature
          ? "Reuniões *"
          : "Valor *";

  // ──────────── Load filter options ────────────
  useEffect(() => {
    async function loadOptions() {
      try {
        const [sellersRes, kpisRes, clientsRes] = await Promise.all([
          fetch("/api/sellers"),
          fetch("/api/kpis"),
          fetch("/api/clients"),
        ]);
        const [sellersJson, kpisJson, clientsJson] = await Promise.all([
          sellersRes.json(),
          kpisRes.json(),
          clientsRes.json(),
        ]);
        if (sellersJson.success) setSellers(sellersJson.data);
        if (kpisJson.success) setKpis(kpisJson.data);
        if (clientsJson.success) setClients(clientsJson.data);
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

  // ──────────── Modal helpers ────────────

  function openCreate() {
    setEditing(null);
    setFormSellerId("");
    setFormKpiId("");
    setFormClientId("");
    setFormValue("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormMaturityLevel("");
    setFormTemperature("");
    setFormScheduledDate("");
    setFormNotes("");
    setModalOpen(true);
  }

  function openEdit(entry: EntryRow) {
    setEditing(entry);
    setFormSellerId(entry.sellerId);
    setFormKpiId(entry.kpiId);
    setFormClientId(entry.clientId ?? "");
    setFormValue(String(entry.value));
    setFormDate(entry.entryDate);
    setFormMaturityLevel(entry.maturityLevel ?? "");
    setFormTemperature(entry.temperature ?? "");
    setFormScheduledDate(entry.scheduledDate ?? "");
    setFormNotes(entry.notes ?? "");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formSellerId) {
      toast.error("Selecione um vendedor");
      return;
    }
    if (!formKpiId) {
      toast.error("Selecione um KPI");
      return;
    }
    if (!formValue || isNaN(parseFloat(formValue)) || parseFloat(formValue) < 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!formDate) {
      toast.error("Selecione uma data");
      return;
    }

    setSaving(true);
    try {
      const url = editing ? `/api/entries?id=${editing.id}` : "/api/entries";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: formSellerId,
          kpiId: formKpiId,
          clientId: formClientId || null,
          value: parseFloat(formValue),
          entryDate: formDate,
          maturityLevel: showMaturityLevel && formMaturityLevel ? formMaturityLevel : null,
          temperature: showTemperature && formTemperature ? formTemperature : null,
          scheduledDate: showTemperature && formScheduledDate ? formScheduledDate : null,
          notes: formNotes || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Lançamento atualizado" : "Lançamento registrado com sucesso");
        setModalOpen(false);
        fetchEntries();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar lançamento");
      }
    } catch {
      toast.error("Erro ao salvar lançamento");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/entries?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Lançamento removido");
        fetchEntries();
      } else {
        toast.error(json.error?.message ?? "Erro ao remover");
      }
    } catch {
      toast.error("Erro ao remover lançamento");
    }
  }

  // ──────────── Formatting ────────────

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

  // ──────────── Client-side text search ────────────

  const filteredEntries = entries.filter((entry) => {
    if (!searchText.trim()) return true;
    const term = searchText.toLowerCase();
    return (
      entry.sellerName?.toLowerCase().includes(term) ||
      entry.kpiName?.toLowerCase().includes(term) ||
      entry.clientName?.toLowerCase().includes(term) ||
      entry.notes?.toLowerCase().includes(term) ||
      (entry.maturityLevel && (MATURITY_LABELS[entry.maturityLevel] ?? entry.maturityLevel).toLowerCase().includes(term)) ||
      (entry.temperature && (TEMPERATURE_LABELS[entry.temperature] ?? entry.temperature).toLowerCase().includes(term))
    );
  });

  // ──────────── Render ────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Histórico de Lançamentos
          </h1>
          <p className="text-muted-foreground">
            Consulte todos os lançamentos de dados realizados
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" data-icon="inline-start" />
          Novo Lançamento
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border p-4 space-y-4">
        <h2 className="text-sm font-semibold">Filtros</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
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
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead className="w-[60px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-8"
                >
                  Nenhum lançamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {formatDate(entry.entryDate)}
                  </TableCell>
                  <TableCell>{entry.sellerName}</TableCell>
                  <TableCell>{entry.kpiName}</TableCell>
                  <TableCell className="text-sm">
                    {entry.clientName ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatValue(entry.kpiType, entry.value)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {entry.maturityLevel && (
                        <span className="inline-flex items-center rounded-full bg-[#C1D9D4]/40 px-2 py-0.5 text-[10px] font-medium text-[#214037]">
                          {MATURITY_LABELS[entry.maturityLevel] ?? entry.maturityLevel}
                        </span>
                      )}
                      {entry.temperature && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${TEMPERATURE_COLORS[entry.temperature] ?? ""}`}>
                          {TEMPERATURE_LABELS[entry.temperature] ?? entry.temperature}
                        </span>
                      )}
                      {entry.scheduledDate && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          Reunião: {formatDate(entry.scheduledDate)}
                        </span>
                      )}
                      {!entry.maturityLevel && !entry.temperature && !entry.scheduledDate && (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[200px]">
                    {entry.notes ? (
                      <div className="group relative">
                        <span className="block truncate">{entry.notes}</span>
                        <div className="invisible group-hover:visible absolute z-50 bottom-full left-0 mb-2 w-72 rounded-lg bg-[#112622] text-white text-xs px-3 py-2 shadow-lg leading-relaxed whitespace-normal">
                          {entry.notes}
                          <div className="absolute top-full left-4 border-4 border-transparent border-t-[#112622]" />
                        </div>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(entry)} title="Editar">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(entry.id)} title="Excluir">
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
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

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Vendedor */}
            <div className="space-y-2">
              <Label>Vendedor *</Label>
              <Select value={formSellerId} onValueChange={(v) => v && setFormSellerId(v)}>
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {formSellerId
                      ? sellers.find((s) => s.id === formSellerId)?.name ?? "Selecione"
                      : "Selecione um vendedor"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* KPI */}
            <div className="space-y-2">
              <Label>KPI *</Label>
              <Select value={formKpiId} onValueChange={(v) => v && setFormKpiId(v)}>
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {formKpiId
                      ? kpis.find((k) => k.id === formKpiId)?.name ?? "Selecione"
                      : "Selecione um KPI"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {kpis.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={formClientId || "__none__"}
                onValueChange={(v) => v && setFormClientId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {formClientId
                      ? clients.find((c) => c.id === formClientId)?.name ?? "Selecione"
                      : "Sem cliente (opcional)"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem cliente</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label htmlFor="entry-value">{valueLabel}</Label>
              <Input
                id="entry-value"
                type="number"
                min="0"
                step="0.01"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Data do Lançamento */}
            <div className="space-y-2">
              <Label htmlFor="entry-date">Data do Lançamento *</Label>
              <Input
                id="entry-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            {/* Conditional: Nível de Maturidade (Ligações) */}
            {showMaturityLevel && (
              <div className="space-y-2">
                <Label>Nível de Maturidade</Label>
                <Select
                  value={formMaturityLevel || "__none__"}
                  onValueChange={(v) => v && setFormMaturityLevel(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <span className="flex flex-1 text-left truncate">
                      {formMaturityLevel
                        ? MATURITY_LABELS[formMaturityLevel] ?? formMaturityLevel
                        : "Selecione (opcional)"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    <SelectItem value="INITIAL">Inicial</SelectItem>
                    <SelectItem value="DEVELOPING">Em Desenvolvimento</SelectItem>
                    <SelectItem value="MATURE">Maduro</SelectItem>
                    <SelectItem value="CLOSING">Fechamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Conditional: Temperatura + Data da Reunião (Reuniões) */}
            {showTemperature && (
              <>
                <div className="space-y-2">
                  <Label>Temperatura</Label>
                  <Select
                    value={formTemperature || "__none__"}
                    onValueChange={(v) => v && setFormTemperature(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="w-full">
                      <span className="flex flex-1 text-left truncate">
                        {formTemperature
                          ? TEMPERATURE_LABELS[formTemperature] ?? formTemperature
                          : "Selecione (opcional)"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      <SelectItem value="COLD">Frio</SelectItem>
                      <SelectItem value="WARM">Morno</SelectItem>
                      <SelectItem value="HOT">Quente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entry-scheduled-date">Data da Reunião</Label>
                  <Input
                    id="entry-scheduled-date"
                    type="date"
                    value={formScheduledDate}
                    onChange={(e) => setFormScheduledDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="entry-notes">Observações</Label>
              <Input
                id="entry-notes"
                type="text"
                maxLength={500}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
