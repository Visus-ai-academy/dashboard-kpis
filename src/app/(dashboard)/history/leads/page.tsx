"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
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

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface LeadRow {
  id: string;
  sellerId: string;
  sellerName: string;
  clientId: string | null;
  clientName: string | null;
  status: string;
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

interface Client {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<string, string> = {
  QUALIFIED: "Qualificado",
  DISQUALIFIED: "Desqualificado",
};

const STATUS_COLORS: Record<string, string> = {
  QUALIFIED: "text-emerald-700 bg-emerald-50 border-emerald-200",
  DISQUALIFIED: "text-red-700 bg-red-50 border-red-200",
};

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────

export default function LeadsHistoryPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
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
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");

  // Create modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formSellerId, setFormSellerId] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formClientName, setFormClientName] = useState("");
  const [formStatus, setFormStatus] = useState<string>("QUALIFIED");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");
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

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("pageSize", "20");
      if (filterStartDate) params.set("startDate", filterStartDate);
      if (filterEndDate) params.set("endDate", filterEndDate);
      if (filterSellerId) params.set("sellerId", filterSellerId);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/lead-entries?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.data);
        setPagination(json.pagination);
      }
    } catch {
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStartDate, filterEndDate, filterSellerId, filterStatus]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  function handleSearch() {
    setCurrentPage(1);
    fetchLeads();
  }

  function clearFilters() {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterSellerId("");
    setFilterStatus("");
    setCurrentPage(1);
  }

  function openCreate() {
    setFormSellerId("");
    setFormClientId("");
    setFormClientName("");
    setFormStatus("QUALIFIED");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formSellerId) {
      toast.error("Selecione um vendedor");
      return;
    }
    if (!formDate) {
      toast.error("Selecione uma data");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/lead-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: formSellerId,
          clientId: formClientId || null,
          clientName: formClientName.trim() || null,
          status: formStatus,
          entryDate: formDate,
          notes: formNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Lead registrado com sucesso");
        setModalOpen(false);
        fetchLeads();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar lead");
      }
    } catch {
      toast.error("Erro ao salvar lead");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/lead-entries?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Lead removido");
        fetchLeads();
      } else {
        toast.error(json.error?.message ?? "Erro ao remover");
      }
    } catch {
      toast.error("Erro ao remover lead");
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

  const filteredLeads = leads.filter((lead) => {
    if (!searchText.trim()) return true;
    const term = searchText.toLowerCase();
    return (
      lead.sellerName?.toLowerCase().includes(term) ||
      lead.clientName?.toLowerCase().includes(term) ||
      (STATUS_LABELS[lead.status] ?? lead.status).toLowerCase().includes(term) ||
      lead.notes?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico de Leads</h1>
          <p className="text-muted-foreground">Registre e consulte leads qualificados e desqualificados</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" data-icon="inline-start" />
          Novo Lead
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
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "")}>
              <SelectTrigger className="w-full">
                <span className="flex flex-1 text-left truncate">
                  {filterStatus ? STATUS_LABELS[filterStatus] ?? "Selecione" : "Todos"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="QUALIFIED">Qualificado</SelectItem>
                <SelectItem value="DISQUALIFIED">Desqualificado</SelectItem>
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
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[60px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum lead encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{formatDate(lead.entryDate)}</TableCell>
                  <TableCell>{lead.sellerName}</TableCell>
                  <TableCell>{lead.clientName ?? "\u2014"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status] ?? ""}`}>
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {lead.notes ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(lead.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(lead.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
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
          <p className="text-xs text-muted-foreground">
            {pagination.total} registro(s) - Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              disabled={currentPage >= pagination.totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Vendedor <span className="text-red-500">*</span></Label>
              <Select value={formSellerId} onValueChange={(v) => setFormSellerId(v ?? "")}>
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

            <div className="space-y-1.5">
              <Label className="text-xs">Cliente <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Select value={formClientId} onValueChange={(v) => { setFormClientId(v ?? ""); if (v) setFormClientName(""); }}>
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {formClientId ? clients.find((c) => c.id === formClientId)?.name ?? "Selecione" : "Selecione ou digite abaixo"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formClientId && (
                <Input
                  placeholder="Ou digite o nome do novo lead..."
                  value={formClientName}
                  onChange={(e) => setFormClientName(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Status <span className="text-red-500">*</span></Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v ?? "QUALIFIED")}>
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {STATUS_LABELS[formStatus] ?? "Selecione"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUALIFIED">Qualificado</SelectItem>
                  <SelectItem value="DISQUALIFIED">Desqualificado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-date" className="text-xs">Data <span className="text-red-500">*</span></Label>
              <Input id="form-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-notes" className="text-xs">Observações <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input
                id="form-notes"
                placeholder="Notas sobre o lead..."
                maxLength={500}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Registrar Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
