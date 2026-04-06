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

interface Season {
  id: string;
  campaignId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function toInputDate(dateStr: string) {
  return new Date(dateStr).toISOString().split("T")[0];
}

export function SeasonsTab({ campaignId }: { campaignId: string }) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [deleting, setDeleting] = useState<Season | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(false);

  const fetchSeasons = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/seasons`);
      const json = await res.json();
      if (json.success) setSeasons(json.data);
    } catch {
      toast.error("Erro ao carregar temporadas");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  function openCreate() {
    setEditing(null);
    setName("");
    setStartDate("");
    setEndDate("");
    setIsActive(false);
    setModalOpen(true);
  }

  function openEdit(season: Season) {
    setEditing(season);
    setName(season.name);
    setStartDate(toInputDate(season.startDate));
    setEndDate(toInputDate(season.endDate));
    setIsActive(season.isActive);
    setModalOpen(true);
  }

  function openDelete(season: Season) {
    setDeleting(season);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!startDate) {
      toast.error("Data de início é obrigatória");
      return;
    }
    if (!endDate) {
      toast.error("Data de término é obrigatória");
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `/api/campaigns/${campaignId}/seasons/${editing.id}`
        : `/api/campaigns/${campaignId}/seasons`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          startDate,
          endDate,
          isActive,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Temporada atualizada" : "Temporada criada");
        setModalOpen(false);
        fetchSeasons();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar temporada");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/seasons/${deleting.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Temporada excluída");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchSeasons();
      } else {
        toast.error(json.error?.message ?? "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao excluir temporada");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(season: Season) {
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/seasons/${season.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !season.isActive }),
        }
      );
      const json = await res.json();
      if (json.success) {
        toast.success(`Temporada ${season.isActive ? "desativada" : "ativada"}`);
        fetchSeasons();
      }
    } catch {
      toast.error("Erro ao alterar status");
    }
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Temporadas</h3>
        <Button onClick={openCreate} size="sm">
          <Plus className="size-4" data-icon="inline-start" />
          Nova Temporada
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Término</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : seasons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma temporada cadastrada
                </TableCell>
              </TableRow>
            ) : (
              seasons.map((season) => (
                <TableRow key={season.id}>
                  <TableCell className="font-medium">{season.name}</TableCell>
                  <TableCell>{formatDate(season.startDate)}</TableCell>
                  <TableCell>{formatDate(season.endDate)}</TableCell>
                  <TableCell>
                    <button onClick={() => toggleStatus(season)} className="cursor-pointer">
                      <Badge variant={season.isActive ? "default" : "secondary"}>
                        {season.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(season)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => openDelete(season)}>
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
            <DialogTitle>{editing ? "Editar Temporada" : "Nova Temporada"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="season-name">Nome *</Label>
              <Input
                id="season-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da temporada"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-date">Data de Início *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Data de Término *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="season-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              <Label htmlFor="season-active">Temporada ativa</Label>
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
            <DialogTitle>Excluir Temporada</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir a temporada{" "}
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
