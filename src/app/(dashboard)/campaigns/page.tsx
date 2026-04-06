"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, Trophy, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  gamificationEnabled: boolean;
  seasonType: string;
  resetPointsOnEnd: boolean;
  teamMode: boolean;
  participantsCount: number;
  createdAt: string;
}

const SEASON_TYPE_LABELS: Record<string, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  CUSTOM: "Personalizada",
};

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [seasonType, setSeasonType] = useState("MONTHLY");
  const [resetPointsOnEnd, setResetPointsOnEnd] = useState(false);
  const [teamMode, setTeamMode] = useState(false);
  const [gamificationEnabled, setGamificationEnabled] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      const json = await res.json();
      if (json.success) setCampaigns(json.data);
    } catch {
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setSeasonType("MONTHLY");
    setResetPointsOnEnd(false);
    setTeamMode(false);
    setGamificationEnabled(true);
    setModalOpen(true);
  }

  function openEdit(campaign: Campaign) {
    setEditing(campaign);
    setName(campaign.name);
    setDescription(campaign.description ?? "");
    setSeasonType(campaign.seasonType);
    setResetPointsOnEnd(campaign.resetPointsOnEnd);
    setTeamMode(campaign.teamMode);
    setGamificationEnabled(campaign.gamificationEnabled);
    setModalOpen(true);
  }

  function openDelete(campaign: Campaign) {
    setDeleting(campaign);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/campaigns/${editing.id}` : "/api/campaigns";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          seasonType,
          resetPointsOnEnd,
          teamMode,
          gamificationEnabled,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Campanha atualizada" : "Campanha criada");
        setModalOpen(false);
        fetchCampaigns();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar campanha");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${deleting.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Campanha excluída");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchCampaigns();
      } else {
        toast.error(json.error?.message ?? "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao excluir campanha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">
            Gerencie suas campanhas de gamificação e endomarketing
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" data-icon="inline-start" />
          Nova Campanha
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-60" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="size-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma campanha cadastrada</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Crie sua primeira campanha para começar a gamificar seus resultados.
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="size-4" data-icon="inline-start" />
              Nova Campanha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/campaigns/${campaign.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {campaign.name}
                </CardTitle>
                <CardAction>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(campaign);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDelete(campaign);
                      }}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardAction>
                {campaign.description && (
                  <CardDescription className="line-clamp-2">
                    {campaign.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={campaign.isActive ? "default" : "secondary"}>
                    {campaign.isActive ? "Ativa" : "Inativa"}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="size-3" />
                    {SEASON_TYPE_LABELS[campaign.seasonType] ?? campaign.seasonType}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Users className="size-3" />
                    {campaign.participantsCount} participante{campaign.participantsCount !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Nome *</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da campanha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-desc">Descrição</Label>
              <Input
                id="campaign-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição da campanha"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Temporada *</Label>
              <Select value={seasonType} onValueChange={(v) => v && setSeasonType(v)}>
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {SEASON_TYPE_LABELS[seasonType] ?? "Selecione"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                  <SelectItem value="MONTHLY">Mensal</SelectItem>
                  <SelectItem value="CUSTOM">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="reset-points"
                checked={resetPointsOnEnd}
                onChange={(e) => setResetPointsOnEnd(e.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              <Label htmlFor="reset-points">Resetar pontos ao fim da temporada</Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="team-mode"
                checked={teamMode}
                onChange={(e) => setTeamMode(e.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              <Label htmlFor="team-mode">Modo equipe</Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="gamification-enabled"
                checked={gamificationEnabled}
                onChange={(e) => setGamificationEnabled(e.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              <Label htmlFor="gamification-enabled">Gamificação ativa</Label>
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
            <DialogTitle>Excluir Campanha</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir a campanha{" "}
            <strong>{deleting?.name}</strong>? Esta ação não pode ser desfeita.
            Todas as regras, temporadas, participantes e níveis associados serão removidos.
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
