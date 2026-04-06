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

interface Kpi {
  id: string;
  name: string;
}

interface ScoringRule {
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  ruleType: string;
  kpiId: string | null;
  kpi: Kpi | null;
  pointsPerUnit: number;
  maxPointsPerDay: number;
  maxPointsPerWeek: number;
  isActive: boolean;
}

const RULE_TYPE_LABELS: Record<string, string> = {
  POINTS_PER_UNIT: "Pontos por unidade",
  BONUS_THRESHOLD: "Bônus por limite",
  MULTIPLIER: "Multiplicador",
};

export function ScoringRulesTab({ campaignId }: { campaignId: string }) {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ScoringRule | null>(null);
  const [deleting, setDeleting] = useState<ScoringRule | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleType, setRuleType] = useState("POINTS_PER_UNIT");
  const [kpiId, setKpiId] = useState("");
  const [pointsPerUnit, setPointsPerUnit] = useState("0");
  const [maxPointsPerDay, setMaxPointsPerDay] = useState("0");
  const [maxPointsPerWeek, setMaxPointsPerWeek] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [rulesRes, kpisRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}/scoring-rules`),
        fetch("/api/kpis"),
      ]);
      const [rulesJson, kpisJson] = await Promise.all([
        rulesRes.json(),
        kpisRes.json(),
      ]);
      if (rulesJson.success) setRules(rulesJson.data);
      if (kpisJson.success) setKpis(kpisJson.data);
    } catch {
      toast.error("Erro ao carregar regras de pontuação");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setRuleType("POINTS_PER_UNIT");
    setKpiId("");
    setPointsPerUnit("0");
    setMaxPointsPerDay("0");
    setMaxPointsPerWeek("0");
    setIsActive(true);
    setModalOpen(true);
  }

  function openEdit(rule: ScoringRule) {
    setEditing(rule);
    setName(rule.name);
    setDescription(rule.description ?? "");
    setRuleType(rule.ruleType);
    setKpiId(rule.kpiId ?? "");
    setPointsPerUnit(String(rule.pointsPerUnit));
    setMaxPointsPerDay(String(rule.maxPointsPerDay));
    setMaxPointsPerWeek(String(rule.maxPointsPerWeek));
    setIsActive(rule.isActive);
    setModalOpen(true);
  }

  function openDelete(rule: ScoringRule) {
    setDeleting(rule);
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
        ? `/api/campaigns/${campaignId}/scoring-rules/${editing.id}`
        : `/api/campaigns/${campaignId}/scoring-rules`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          ruleType,
          kpiId: kpiId || null,
          pointsPerUnit: Number(pointsPerUnit) || 0,
          maxPointsPerDay: Number(maxPointsPerDay) || 0,
          maxPointsPerWeek: Number(maxPointsPerWeek) || 0,
          isActive,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Regra atualizada" : "Regra criada");
        setModalOpen(false);
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar regra");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/scoring-rules/${deleting.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Regra excluída");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao excluir regra");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Regras de Pontuação</h3>
        <Button onClick={openCreate} size="sm">
          <Plus className="size-4" data-icon="inline-start" />
          Nova Regra
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>KPI Base</TableHead>
              <TableHead>Pontos/Unidade</TableHead>
              <TableHead>Máx/Dia</TableHead>
              <TableHead>Máx/Semana</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhuma regra de pontuação cadastrada
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>{RULE_TYPE_LABELS[rule.ruleType] ?? rule.ruleType}</TableCell>
                  <TableCell>{rule.kpi?.name ?? "—"}</TableCell>
                  <TableCell>{rule.pointsPerUnit}</TableCell>
                  <TableCell>{rule.maxPointsPerDay}</TableCell>
                  <TableCell>{rule.maxPointsPerWeek}</TableCell>
                  <TableCell>
                    <Badge variant={rule.isActive ? "default" : "secondary"}>
                      {rule.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(rule)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => openDelete(rule)}>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Regra" : "Nova Regra"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Nome *</Label>
              <Input
                id="rule-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da regra"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-desc">Descrição</Label>
              <Input
                id="rule-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição da regra"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Regra *</Label>
              <Select value={ruleType} onValueChange={(v) => v && setRuleType(v)}>
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {RULE_TYPE_LABELS[ruleType] ?? "Selecione"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POINTS_PER_UNIT">Pontos por unidade</SelectItem>
                  <SelectItem value="BONUS_THRESHOLD">Bônus por limite</SelectItem>
                  <SelectItem value="MULTIPLIER">Multiplicador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>KPI Base</Label>
              <Select value={kpiId} onValueChange={(v) => setKpiId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {kpiId ? (kpis.find((k) => k.id === kpiId)?.name ?? "Selecione um KPI") : "Nenhum (opcional)"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {kpis.map((kpi) => (
                    <SelectItem key={kpi.id} value={kpi.id}>
                      {kpi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="points-per-unit">Pontos/Unidade</Label>
                <Input
                  id="points-per-unit"
                  type="number"
                  value={pointsPerUnit}
                  onChange={(e) => setPointsPerUnit(e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-day">Máx Pontos/Dia</Label>
                <Input
                  id="max-day"
                  type="number"
                  value={maxPointsPerDay}
                  onChange={(e) => setMaxPointsPerDay(e.target.value)}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-week">Máx Pontos/Semana</Label>
                <Input
                  id="max-week"
                  type="number"
                  value={maxPointsPerWeek}
                  onChange={(e) => setMaxPointsPerWeek(e.target.value)}
                  min="0"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="rule-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              <Label htmlFor="rule-active">Regra ativa</Label>
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
            <DialogTitle>Excluir Regra</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir a regra{" "}
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
