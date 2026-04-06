"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

interface GamificationLevel {
  id: string;
  campaignId: string;
  name: string;
  minPoints: number;
  badgeEmoji: string | null;
  displayOrder: number;
}

export function LevelsTab({ campaignId }: { campaignId: string }) {
  const [levels, setLevels] = useState<GamificationLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GamificationLevel | null>(null);
  const [deleting, setDeleting] = useState<GamificationLevel | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [minPoints, setMinPoints] = useState("0");
  const [badgeEmoji, setBadgeEmoji] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");

  const fetchLevels = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/levels`);
      const json = await res.json();
      if (json.success) setLevels(json.data);
    } catch {
      toast.error("Erro ao carregar níveis");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  function openCreate() {
    setEditing(null);
    setName("");
    setMinPoints("0");
    setBadgeEmoji("");
    setDisplayOrder(String(levels.length));
    setModalOpen(true);
  }

  function openEdit(level: GamificationLevel) {
    setEditing(level);
    setName(level.name);
    setMinPoints(String(level.minPoints));
    setBadgeEmoji(level.badgeEmoji ?? "");
    setDisplayOrder(String(level.displayOrder));
    setModalOpen(true);
  }

  function openDelete(level: GamificationLevel) {
    setDeleting(level);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `/api/campaigns/${campaignId}/levels/${editing.id}`
        : `/api/campaigns/${campaignId}/levels`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          minPoints: Number(minPoints) || 0,
          badgeEmoji: badgeEmoji.trim() || null,
          displayOrder: Number(displayOrder) || 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Nível atualizado" : "Nível criado");
        setModalOpen(false);
        fetchLevels();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar nível");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/levels/${deleting.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Nível excluído");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchLevels();
      } else {
        toast.error(json.error?.message ?? "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao excluir nível");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Níveis de Gamificação</h3>
        <Button onClick={openCreate} size="sm">
          <Plus className="size-4" data-icon="inline-start" />
          Novo Nível
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Ordem</TableHead>
              <TableHead className="w-[60px]">Badge</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Pontuação Mínima</TableHead>
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
            ) : levels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum nível cadastrado
                </TableCell>
              </TableRow>
            ) : (
              levels.map((level) => (
                <TableRow key={level.id}>
                  <TableCell className="text-center">{level.displayOrder}</TableCell>
                  <TableCell className="text-center text-lg">{level.badgeEmoji ?? "—"}</TableCell>
                  <TableCell className="font-medium">{level.name}</TableCell>
                  <TableCell>{level.minPoints.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(level)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => openDelete(level)}>
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
            <DialogTitle>{editing ? "Editar Nível" : "Novo Nível"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="level-name">Nome *</Label>
              <Input
                id="level-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Bronze, Prata, Ouro..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="min-points">Pontuação Mínima *</Label>
                <Input
                  id="min-points"
                  type="number"
                  value={minPoints}
                  onChange={(e) => setMinPoints(e.target.value)}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display-order">Ordem</Label>
                <Input
                  id="display-order"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  min="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge-emoji">Badge (Emoji)</Label>
              <Input
                id="badge-emoji"
                value={badgeEmoji}
                onChange={(e) => setBadgeEmoji(e.target.value)}
                placeholder="Ex: &#x1F947; &#x1F948; &#x1F949;"
                maxLength={10}
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
            <DialogTitle>Excluir Nível</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o nível{" "}
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
