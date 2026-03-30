"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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

interface Unit {
  id: string;
  name: string;
}

interface Sector {
  id: string;
  name: string;
  unitId: string;
  isActive: boolean;
  unit: { name: string };
}

export default function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Sector | null>(null);
  const [deleting, setDeleting] = useState<Sector | null>(null);
  const [name, setName] = useState("");
  const [unitId, setUnitId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sectorsRes, unitsRes] = await Promise.all([
        fetch("/api/sectors"),
        fetch("/api/units"),
      ]);
      const [sectorsJson, unitsJson] = await Promise.all([
        sectorsRes.json(),
        unitsRes.json(),
      ]);
      if (sectorsJson.success) setSectors(sectorsJson.data);
      if (unitsJson.success) setUnits(unitsJson.data);
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setName("");
    setUnitId("");
    setModalOpen(true);
  }

  function openEdit(sector: Sector) {
    setEditing(sector);
    setName(sector.name);
    setUnitId(sector.unitId);
    setModalOpen(true);
  }

  function openDelete(sector: Sector) {
    setDeleting(sector);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!unitId) {
      toast.error("Selecione uma unidade");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/sectors/${editing.id}` : "/api/sectors";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), unitId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Setor atualizado" : "Setor criado");
        setModalOpen(false);
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar setor");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sectors/${deleting.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Setor excluído");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao excluir setor");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(sector: Sector) {
    try {
      const res = await fetch(`/api/sectors/${sector.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !sector.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Setor ${sector.isActive ? "desativado" : "ativado"}`);
        fetchData();
      }
    } catch {
      toast.error("Erro ao alterar status");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Setores</h1>
          <p className="text-muted-foreground">
            Gerencie os setores vinculados as unidades
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" data-icon="inline-start" />
          Novo Setor
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
              ))
            ) : sectors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum setor cadastrado
                </TableCell>
              </TableRow>
            ) : (
              sectors.map((sector) => (
                <TableRow key={sector.id}>
                  <TableCell className="font-medium">{sector.name}</TableCell>
                  <TableCell>{sector.unit.name}</TableCell>
                  <TableCell>
                    <button onClick={() => toggleStatus(sector)} className="cursor-pointer">
                      <Badge variant={sector.isActive ? "default" : "secondary"}>
                        {sector.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(sector)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => openDelete(sector)}>
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
            <DialogTitle>{editing ? "Editar Setor" : "Novo Setor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sector-name">Nome *</Label>
              <Input
                id="sector-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do setor"
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade *</Label>
              <Select value={unitId} onValueChange={(v) => v && setUnitId(v)}>
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {unitId ? (units.find((u) => u.id === unitId)?.name ?? "Selecione uma unidade") : "Selecione uma unidade"}
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
            <DialogTitle>Excluir Setor</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o setor{" "}
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
