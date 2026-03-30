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
import { Skeleton } from "@/components/ui/skeleton";

interface Unit {
  id: string;
  name: string;
  isActive: boolean;
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [deleting, setDeleting] = useState<Unit | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch("/api/units");
      const json = await res.json();
      if (json.success) setUnits(json.data);
    } catch {
      toast.error("Erro ao carregar unidades");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  function openCreate() {
    setEditing(null);
    setName("");
    setModalOpen(true);
  }

  function openEdit(unit: Unit) {
    setEditing(unit);
    setName(unit.name);
    setModalOpen(true);
  }

  function openDelete(unit: Unit) {
    setDeleting(unit);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/units/${editing.id}` : "/api/units";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Unidade atualizada" : "Unidade criada");
        setModalOpen(false);
        fetchUnits();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar unidade");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/units/${deleting.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Unidade excluida");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchUnits();
      } else {
        toast.error(json.error?.message ?? "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao excluir unidade");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(unit: Unit) {
    try {
      const res = await fetch(`/api/units/${unit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !unit.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Unidade ${unit.isActive ? "desativada" : "ativada"}`);
        fetchUnits();
      }
    } catch {
      toast.error("Erro ao alterar status");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unidades</h1>
          <p className="text-muted-foreground">
            Gerencie as unidades da sua empresa
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" data-icon="inline-start" />
          Nova Unidade
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
              ))
            ) : units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  Nenhuma unidade cadastrada
                </TableCell>
              </TableRow>
            ) : (
              units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell>
                    <button onClick={() => toggleStatus(unit)} className="cursor-pointer">
                      <Badge variant={unit.isActive ? "default" : "secondary"}>
                        {unit.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(unit)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => openDelete(unit)}>
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
            <DialogTitle>{editing ? "Editar Unidade" : "Nova Unidade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unit-name">Nome *</Label>
              <Input
                id="unit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da unidade"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
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
            <DialogTitle>Excluir Unidade</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir a unidade{" "}
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
