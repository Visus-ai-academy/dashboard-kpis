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

interface Sector {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  sectorId: string;
  isActive: boolean;
  sector: { name: string };
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [teamsRes, sectorsRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/sectors"),
      ]);
      const [teamsJson, sectorsJson] = await Promise.all([
        teamsRes.json(),
        sectorsRes.json(),
      ]);
      if (teamsJson.success) setTeams(teamsJson.data);
      if (sectorsJson.success) setSectors(sectorsJson.data);
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
    setSectorId("");
    setModalOpen(true);
  }

  function openEdit(team: Team) {
    setEditing(team);
    setName(team.name);
    setSectorId(team.sectorId);
    setModalOpen(true);
  }

  function openDelete(team: Team) {
    setDeleting(team);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!sectorId) {
      toast.error("Selecione um setor");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/teams/${editing.id}` : "/api/teams";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sectorId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Equipe atualizada" : "Equipe criada");
        setModalOpen(false);
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar equipe");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${deleting.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Equipe excluida");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao excluir equipe");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(team: Team) {
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !team.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Equipe ${team.isActive ? "desativada" : "ativada"}`);
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
          <h1 className="text-2xl font-bold tracking-tight">Equipes</h1>
          <p className="text-muted-foreground">
            Gerencie as equipes vinculadas aos setores
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" data-icon="inline-start" />
          Nova Equipe
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Setor</TableHead>
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
            ) : teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhuma equipe cadastrada
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.sector.name}</TableCell>
                  <TableCell>
                    <button onClick={() => toggleStatus(team)} className="cursor-pointer">
                      <Badge variant={team.isActive ? "default" : "secondary"}>
                        {team.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(team)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => openDelete(team)}>
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
            <DialogTitle>{editing ? "Editar Equipe" : "Nova Equipe"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Nome *</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da equipe"
              />
            </div>
            <div className="space-y-2">
              <Label>Setor *</Label>
              <Select value={sectorId} onValueChange={(v) => v && setSectorId(v)}>
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {sectorId ? (sectors.find((s) => s.id === sectorId)?.name ?? "Selecione um setor") : "Selecione um setor"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
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
            <DialogTitle>Excluir Equipe</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir a equipe{" "}
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
