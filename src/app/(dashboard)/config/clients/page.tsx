"use client";

import { useState, useEffect, useCallback } from "react";
import { useUnitFilter } from "@/lib/hooks/use-unit-filter";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "CLIENT" | "INACTIVE";
  entryDate: string | null;
  exitDate: string | null;
  exitReason: string | null;
  unitId: string | null;
  notes: string | null;
}

interface Unit {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<string, string> = {
  CLIENT: "Cliente",
  INACTIVE: "Inativo",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  CLIENT: "default",
  INACTIVE: "secondary",
};

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  } catch {
    return "-";
  }
}

export default function ClientsPage() {
  const unitIdFilter = useUnitFilter();

  const [clients, setClients] = useState<Client[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string>("CLIENT");
  const [unitId, setUnitId] = useState("");
  const [notes, setNotes] = useState("");
  const [formEntryDate, setFormEntryDate] = useState("");
  const [formExitDate, setFormExitDate] = useState("");
  const [formExitReason, setFormExitReason] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (unitIdFilter) params.set("unitId", unitIdFilter);
      if (search.trim()) params.set("search", search.trim());
      const qs = params.toString();

      const [clientsRes, unitsRes] = await Promise.all([
        fetch(`/api/clients${qs ? `?${qs}` : ""}`),
        fetch("/api/units"),
      ]);
      const [clientsJson, unitsJson] = await Promise.all([
        clientsRes.json(),
        unitsRes.json(),
      ]);
      if (clientsJson.success) setClients(clientsJson.data);
      if (unitsJson.success) setUnits(unitsJson.data);
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [unitIdFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setStatus("CLIENT");
    setUnitId("");
    setNotes("");
    setFormEntryDate("");
    setFormExitDate("");
    setFormExitReason("");
    setModalOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setName(client.name);
    setEmail(client.email ?? "");
    setPhone(client.phone ?? "");
    setStatus(client.status);
    setUnitId(client.unitId ?? "");
    setNotes(client.notes ?? "");
    setFormEntryDate(client.entryDate ? client.entryDate.slice(0, 10) : "");
    setFormExitDate(client.exitDate ? client.exitDate.slice(0, 10) : "");
    setFormExitReason(client.exitReason ?? "");
    setModalOpen(true);
  }

  function openDelete(client: Client) {
    setDeleting(client);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/clients/${editing.id}` : "/api/clients";
      const method = editing ? "PUT" : "POST";
      const payload: Record<string, unknown> = {
        name: name.trim(),
        status,
      };
      if (email.trim()) payload.email = email.trim();
      if (phone.trim()) payload.phone = phone.trim();
      if (unitId) payload.unitId = unitId;
      if (notes.trim()) payload.notes = notes.trim();
      payload.entryDate = formEntryDate || null;
      payload.exitDate = formExitDate || null;
      payload.exitReason = formExitReason.trim() || null;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Cliente atualizado" : "Cliente criado");
        setModalOpen(false);
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar cliente");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${deleting.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Cliente excluído");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao excluir cliente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" data-icon="inline-start" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Data Entrada</TableHead>
              <TableHead>Data Saída</TableHead>
              <TableHead>Motivo Saída</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Nenhum cliente cadastrado
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.email ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.phone ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[client.status] ?? "outline"}>
                      {STATUS_LABELS[client.status] ?? client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.unitId
                      ? units.find((u) => u.id === client.unitId)?.name ?? "-"
                      : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateBR(client.entryDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateBR(client.exitDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.exitReason ?? "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(client)} title="Editar">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => openDelete(client)} title="Excluir">
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

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome *</Label>
              <Input
                id="client-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do cliente ou empresa"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Telefone</Label>
                <Input
                  id="client-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                  <SelectTrigger className="w-full">
                    <span className="flex flex-1 text-left truncate">
                      {STATUS_LABELS[status] ?? "Selecione"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT">Cliente</SelectItem>
                    <SelectItem value="INACTIVE">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={unitId} onValueChange={(v) => v && setUnitId(v)}>
                  <SelectTrigger className="w-full">
                    <span className="flex flex-1 text-left truncate">
                      {unitId
                        ? units.find((u) => u.id === unitId)?.name ?? "Selecione"
                        : "Todas (opcional)"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-entry-date">Data de Entrada</Label>
                <Input
                  id="client-entry-date"
                  type="date"
                  value={formEntryDate}
                  onChange={(e) => setFormEntryDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-exit-date">Data de Saída</Label>
                <Input
                  id="client-exit-date"
                  type="date"
                  value={formExitDate}
                  onChange={(e) => setFormExitDate(e.target.value)}
                />
              </div>
            </div>
            {(formExitDate || status === "INACTIVE") && (
              <div className="space-y-2">
                <Label htmlFor="client-exit-reason">Motivo da Saída</Label>
                <Input
                  id="client-exit-reason"
                  value={formExitReason}
                  onChange={(e) => setFormExitReason(e.target.value)}
                  placeholder="Motivo da saída do cliente"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="client-notes">Observações</Label>
              <Input
                id="client-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais sobre o cliente"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o cliente{" "}
            <strong>{deleting?.name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
