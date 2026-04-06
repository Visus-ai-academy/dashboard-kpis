"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, Plus, Trash2, Pencil } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils/formatting";

interface SaleRow {
  id: string;
  sellerId: string;
  sellerName: string;
  clientId: string | null;
  clientName: string | null;
  amount: number;
  expectedVolume: number | null;
  volumeUnit: string | null;
  saleDate: string;
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

interface Client {
  id: string;
  name: string;
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: 20, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Filters
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSellerId, setFilterSellerId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SaleRow | null>(null);
  const [formSellerId, setFormSellerId] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formExpectedVolume, setFormExpectedVolume] = useState("");
  const [formVolumeUnit, setFormVolumeUnit] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [sellersRes, clientsRes] = await Promise.all([
          fetch("/api/sellers"),
          fetch("/api/clients"),
        ]);
        const [sellersJson, clientsJson] = await Promise.all([
          sellersRes.json(),
          clientsRes.json(),
        ]);
        if (sellersJson.success) setSellers(sellersJson.data);
        if (clientsJson.success) setClients(clientsJson.data);
      } catch {
        toast.error("Erro ao carregar dados");
      }
    }
    loadOptions();
  }, []);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("pageSize", "20");
      if (filterStartDate) params.set("startDate", filterStartDate);
      if (filterEndDate) params.set("endDate", filterEndDate);
      if (filterSellerId) params.set("sellerId", filterSellerId);

      const res = await fetch(`/api/sales?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSales(json.data.sales);
        setPagination(json.data.pagination);
      }
    } catch {
      toast.error("Erro ao carregar vendas");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStartDate, filterEndDate, filterSellerId]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  function handleSearch() {
    setCurrentPage(1);
    fetchSales();
  }

  function clearFilters() {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterSellerId("");
    setCurrentPage(1);
  }

  function openCreate() {
    setEditing(null);
    setFormSellerId("");
    setFormClientId("");
    setFormAmount("");
    setFormExpectedVolume("");
    setFormVolumeUnit("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setModalOpen(true);
  }

  function openEdit(sale: SaleRow) {
    setEditing(sale);
    setFormSellerId(sale.sellerId);
    setFormClientId(sale.clientId ?? "");
    setFormAmount(String(sale.amount));
    setFormExpectedVolume(sale.expectedVolume != null ? String(sale.expectedVolume) : "");
    setFormVolumeUnit(sale.volumeUnit ?? "");
    setFormDate(sale.saleDate);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formSellerId) {
      toast.error("Selecione um vendedor");
      return;
    }
    if (!formAmount || isNaN(parseFloat(formAmount)) || parseFloat(formAmount) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!formDate) {
      toast.error("Selecione uma data");
      return;
    }

    setSaving(true);
    try {
      const url = editing ? `/api/sales?id=${editing.id}` : "/api/sales";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: formSellerId,
          clientId: formClientId || null,
          amount: parseFloat(formAmount),
          expectedVolume: formExpectedVolume ? parseInt(formExpectedVolume) : null,
          volumeUnit: formVolumeUnit.trim() || null,
          saleDate: formDate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Venda atualizada" : "Venda registrada com sucesso");
        setModalOpen(false);
        fetchSales();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar venda");
      }
    } catch {
      toast.error("Erro ao salvar venda");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/sales?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Venda removida");
        fetchSales();
      } else {
        toast.error(json.error?.message ?? "Erro ao remover");
      }
    } catch {
      toast.error("Erro ao remover venda");
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  }

  function formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  const filteredSales = sales.filter((sale) => {
    if (!searchText.trim()) return true;
    const term = searchText.toLowerCase();
    return (
      sale.sellerName?.toLowerCase().includes(term) ||
      sale.clientName?.toLowerCase().includes(term) ||
      formatCurrency(sale.amount).toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico de Vendas</h1>
          <p className="text-muted-foreground">Registre e consulte todas as vendas realizadas</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" data-icon="inline-start" />
          Nova Venda
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="filter-start" className="text-xs">Data Início</Label>
            <Input id="filter-start" type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-end" className="text-xs">Data Fim</Label>
            <Input id="filter-end" type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vendedor</Label>
            <Select value={filterSellerId} onValueChange={(v) => setFilterSellerId(v ?? "")}>
              <SelectTrigger className="w-full">
                <span className="flex flex-1 text-left truncate">
                  {filterSellerId ? sellers.find((s) => s.id === filterSellerId)?.name ?? "Selecione" : "Todos"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
              <TableHead>Lead</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Volumetria</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead className="w-[60px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma venda encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{formatDate(sale.saleDate)}</TableCell>
                  <TableCell>{sale.sellerName}</TableCell>
                  <TableCell className="text-sm">
                    {sale.clientName ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(sale.amount)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {sale.expectedVolume != null ? (
                      <span>{sale.expectedVolume}{sale.volumeUnit ? ` ${sale.volumeUnit}` : ""}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatDateTime(sale.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(sale)} title="Editar">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(sale.id)} title="Excluir">
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
            {pagination.total} vendas
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-xs" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-sm font-medium">{pagination.page} / {pagination.totalPages}</span>
            <Button variant="outline" size="icon-xs" onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={currentPage === pagination.totalPages}>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Venda" : "Nova Venda"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vendedor *</Label>
              <Select value={formSellerId} onValueChange={(v) => v && setFormSellerId(v)}>
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {formSellerId ? sellers.find((s) => s.id === formSellerId)?.name ?? "Selecione" : "Selecione um vendedor"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={formClientId || "__none__"} onValueChange={(v) => v && setFormClientId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {formClientId ? clients.find((c) => c.id === formClientId)?.name ?? "Selecione" : "Sem cliente (opcional)"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem cliente</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale-amount">Valor (R$) *</Label>
              <Input
                id="sale-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sale-volume">Volumetria Esperada</Label>
                <Input
                  id="sale-volume"
                  type="number"
                  min="0"
                  step="1"
                  value={formExpectedVolume}
                  onChange={(e) => setFormExpectedVolume(e.target.value)}
                  placeholder="Ex: 500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-unit">Unidade</Label>
                <Input
                  id="sale-unit"
                  type="text"
                  value={formVolumeUnit}
                  onChange={(e) => setFormVolumeUnit(e.target.value)}
                  placeholder="Ex: licenças, unidades"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale-date">Data da Venda *</Label>
              <Input
                id="sale-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
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
