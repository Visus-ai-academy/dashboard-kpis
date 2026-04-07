"use client";

import { useState, useEffect, useCallback } from "react";
import { useUnitFilter } from "@/lib/hooks/use-unit-filter";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Calendar,
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

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface KpiSector {
  id: string;
  sectorId: string;
  sector: { name: string };
}
interface KpiSeller {
  id: string;
  sellerId: string;
  customTarget: number | null;
  seller: { name: string };
}
interface Kpi {
  id: string;
  name: string;
  type: string;
  periodicity: string;
  targetValue: number;
  isIndividual: boolean;
  isRequired: boolean;
  isPrimary: boolean;
  scope: string;
  chartType: string;
  unitId: string | null;
  displayOrder: number;
  isActive: boolean;
  kpiSectors: KpiSector[];
  kpiSellers: KpiSeller[];
}

interface Seller {
  id: string;
  name: string;
}

interface MonthlyTarget {
  id: string;
  kpiId: string;
  sellerId: string | null;
  month: number;
  year: number;
  targetValue: number;
}

const TYPE_LABELS: Record<string, string> = {
  NUMERIC: "Numerico",
  MONETARY: "Monetario (R$)",
  PERCENTAGE: "Porcentagem (%)",
};

const PERIODICITY_LABELS: Record<string, string> = {
  DAILY: "Diario",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
};

const SCOPE_LABELS: Record<string, string> = {
  COMPANY: "Empresa",
  SPECIFIC_SELLERS: "Vendedores especificos",
};

const CHART_LABELS: Record<string, string> = {
  LINE: "Linha",
  BAR: "Barras",
  AREA: "Area",
  STACKED_BAR: "Barras Empilhadas",
};

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

interface Unit {
  id: string;
  name: string;
}

export default function KpisPage() {
  const unitIdFilter = useUnitFilter();

  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // KPI modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Kpi | null>(null);
  const [deleting, setDeleting] = useState<Kpi | null>(null);
  const [saving, setSaving] = useState(false);

  // KPI form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("NUMERIC");
  const [formPeriodicity, setFormPeriodicity] = useState("DAILY");
  const [formTarget, setFormTarget] = useState("0");
  const [formIndividual, setFormIndividual] = useState(true);
  const [formRequired, setFormRequired] = useState(true);
  const [formPrimary, setFormPrimary] = useState(false);
  const [formScope, setFormScope] = useState("COMPANY");
  const [formChart, setFormChart] = useState("LINE");
  const [formUnitId, setFormUnitId] = useState<string | null>(null);
  const [formSellerIds, setFormSellerIds] = useState<string[]>([]);

  // Monthly targets modal
  const [mtOpen, setMtOpen] = useState(false);
  const [mtYear, setMtYear] = useState(new Date().getFullYear());
  const [mtTargets, setMtTargets] = useState<Record<string, number>>({});
  const [mtLoading, setMtLoading] = useState(false);
  const [mtSaving, setMtSaving] = useState(false);

  // ──────────── Data fetching ────────────

  const fetchData = useCallback(async () => {
    try {
      const unitParam = unitIdFilter ? `?unitId=${unitIdFilter}` : "";
      const [kpisRes, sellersRes, unitsRes] = await Promise.all([
        fetch(`/api/kpis${unitParam}`),
        fetch("/api/sellers"),
        fetch("/api/units"),
      ]);
      const [kpisJson, sellersJson, unitsJson] = await Promise.all([
        kpisRes.json(),
        sellersRes.json(),
        unitsRes.json(),
      ]);
      if (kpisJson.success) setKpis(kpisJson.data);
      if (sellersJson.success) setSellers(sellersJson.data);
      if (unitsJson.success) setUnits(unitsJson.data);
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [unitIdFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ──────────── KPI CRUD ────────────

  function openCreate() {
    setEditing(null);
    setFormName("");
    setFormType("NUMERIC");
    setFormPeriodicity("DAILY");
    setFormTarget("0");
    setFormIndividual(true);
    setFormRequired(true);
    setFormPrimary(false);
    setFormScope("COMPANY");
    setFormChart("LINE");
    setFormUnitId(null);
    setFormSellerIds([]);
    setModalOpen(true);
  }

  function openEdit(kpi: Kpi) {
    setEditing(kpi);
    setFormName(kpi.name);
    setFormType(kpi.type);
    setFormPeriodicity(kpi.periodicity);
    setFormTarget(String(kpi.targetValue));
    setFormIndividual(kpi.isIndividual);
    setFormRequired(kpi.isRequired);
    setFormPrimary(kpi.isPrimary);
    setFormScope(kpi.scope);
    setFormChart(kpi.chartType);
    setFormUnitId(kpi.unitId ?? null);
    setFormSellerIds(kpi.kpiSellers?.map((ks) => ks.sellerId) ?? []);
    setModalOpen(true);
  }

  function openDelete(kpi: Kpi) {
    setDeleting(kpi);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (formScope === "SPECIFIC_SELLERS" && formSellerIds.length === 0) {
      toast.error("Selecione ao menos um vendedor");
      return;
    }
    const targetValue = parseFloat(formTarget);
    if (isNaN(targetValue) || targetValue < 0) {
      toast.error("Valor alvo inválido");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/kpis/${editing.id}` : "/api/kpis";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          type: formType,
          periodicity: formPeriodicity,
          targetValue,
          isIndividual: formIndividual,
          isRequired: formRequired,
          isPrimary: formPrimary,
          scope: formScope,
          chartType: formChart,
          unitId: formUnitId || null,
          sellerIds: formScope === "SPECIFIC_SELLERS" ? formSellerIds : [],
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "KPI atualizado" : "KPI criado");
        setModalOpen(false);
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar KPI");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/kpis/${deleting.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("KPI excluído");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao excluir KPI");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(kpi: Kpi) {
    try {
      const res = await fetch(`/api/kpis/${kpi.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !kpi.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`KPI ${kpi.isActive ? "desativado" : "ativado"}`);
        fetchData();
      }
    } catch {
      toast.error("Erro ao alterar status");
    }
  }

  async function reorder(id: string, direction: "up" | "down") {
    try {
      const res = await fetch("/api/kpis/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, direction }),
      });
      const json = await res.json();
      if (json.success) fetchData();
    } catch {
      toast.error("Erro ao reordenar");
    }
  }

  // ──────────── Monthly Targets ────────────

  async function openMonthlyTargets() {
    setMtOpen(true);
    setMtLoading(true);
    try {
      const res = await fetch(`/api/kpis/monthly-targets?year=${mtYear}`);
      const json = await res.json();
      if (json.success) {
        const map: Record<string, number> = {};
        (json.data.targets as MonthlyTarget[]).forEach((t) => {
          const key = `${t.kpiId}-${t.sellerId ?? "company"}-${t.month}`;
          map[key] = t.targetValue;
        });
        setMtTargets(map);
      }
    } catch {
      toast.error("Erro ao carregar metas mensais");
    } finally {
      setMtLoading(false);
    }
  }

  function getMtValue(kpiId: string, month: number): string {
    const key = `${kpiId}-company-${month}`;
    const val = mtTargets[key];
    return val !== undefined ? String(val) : "";
  }

  function setMtValue(kpiId: string, month: number, value: string) {
    const key = `${kpiId}-company-${month}`;
    const num = parseFloat(value);
    setMtTargets((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : num,
    }));
  }

  async function saveMonthlyTargets() {
    setMtSaving(true);
    try {
      const entries: Array<{
        kpiId: string;
        sellerId?: null;
        year: number;
        targets: Array<{ month: number; targetValue: number }>;
      }> = [];

      for (const kpi of kpis) {
        const targets: Array<{ month: number; targetValue: number }> = [];
        for (let m = 1; m <= 12; m++) {
          const key = `${kpi.id}-company-${m}`;
          const val = mtTargets[key];
          if (val !== undefined && val > 0) {
            targets.push({ month: m, targetValue: val });
          }
        }
        if (targets.length > 0) {
          entries.push({
            kpiId: kpi.id,
            sellerId: null,
            year: mtYear,
            targets,
          });
        }
      }

      if (entries.length === 0) {
        toast.info("Nenhuma meta para salvar");
        setMtSaving(false);
        return;
      }

      const res = await fetch("/api/kpis/monthly-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Metas mensais salvas");
        setMtOpen(false);
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar metas");
      }
    } catch {
      toast.error("Erro ao salvar metas mensais");
    } finally {
      setMtSaving(false);
    }
  }

  // ──────────── Render ────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPIs</h1>
          <p className="text-muted-foreground">
            Defina e gerencie os indicadores de desempenho
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openMonthlyTargets}>
            <Calendar className="size-4" data-icon="inline-start" />
            Metas Mensais
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" data-icon="inline-start" />
            Novo KPI
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Ordem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Periodicidade</TableHead>
              <TableHead>Meta</TableHead>
              <TableHead>Escopo</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Gráfico</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : kpis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Nenhum KPI cadastrado
                </TableCell>
              </TableRow>
            ) : (
              kpis.map((kpi, index) => (
                <TableRow key={kpi.id}>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => reorder(kpi.id, "up")}
                        disabled={index === 0}
                      >
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => reorder(kpi.id, "down")}
                        disabled={index === kpis.length - 1}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{kpi.name}</TableCell>
                  <TableCell>{TYPE_LABELS[kpi.type] ?? kpi.type}</TableCell>
                  <TableCell>
                    {PERIODICITY_LABELS[kpi.periodicity] ?? kpi.periodicity}
                  </TableCell>
                  <TableCell>{kpi.targetValue}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {SCOPE_LABELS[kpi.scope] ?? kpi.scope}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {(kpi as any).unit?.name ?? "Global"}
                  </TableCell>
                  <TableCell>
                    {CHART_LABELS[kpi.chartType] ?? kpi.chartType}
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleStatus(kpi)} className="cursor-pointer">
                      <Badge variant={kpi.isActive ? "default" : "secondary"}>
                        {kpi.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(kpi)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => openDelete(kpi)}>
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

      {/* ──────── Create/Edit KPI Modal ──────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar KPI" : "Novo KPI"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kpi-name">Nome *</Label>
              <Input
                id="kpi-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome do KPI"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formType} onValueChange={(v) => v && setFormType(v)}>
                  <SelectTrigger className="w-full">
                    <span className="flex flex-1 text-left truncate">
                      {{ NUMERIC: "Numérico", MONETARY: "Monetário (R$)", PERCENTAGE: "Porcentagem (%)" }[formType] ?? "Selecione"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NUMERIC">Numérico</SelectItem>
                    <SelectItem value="MONETARY">Monetário (R$)</SelectItem>
                    <SelectItem value="PERCENTAGE">Porcentagem (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Periodicidade *</Label>
                <Select value={formPeriodicity} onValueChange={(v) => v && setFormPeriodicity(v)}>
                  <SelectTrigger className="w-full">
                    <span className="flex flex-1 text-left truncate">
                      {{ DAILY: "Diário", WEEKLY: "Semanal", MONTHLY: "Mensal" }[formPeriodicity] ?? "Selecione"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Diário</SelectItem>
                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kpi-target">Meta *</Label>
              <Input
                id="kpi-target"
                type="number"
                min="0"
                step="any"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Escopo *</Label>
                <Select value={formScope} onValueChange={(v) => v && setFormScope(v)}>
                  <SelectTrigger className="w-full">
                    <span className="flex flex-1 text-left truncate">
                      {{ COMPANY: "Empresa", SPECIFIC_SELLERS: "Vendedores específicos" }[formScope] ?? "Selecione"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPANY">Empresa</SelectItem>
                    <SelectItem value="SPECIFIC_SELLERS">
                      Vendedores específicos
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Gráfico *</Label>
                <Select value={formChart} onValueChange={(v) => v && setFormChart(v)}>
                  <SelectTrigger className="w-full">
                    <span className="flex flex-1 text-left truncate">
                      {{ LINE: "Linha" }[formChart] ?? "Linha"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LINE">Linha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Seleção de vendedores quando escopo é SPECIFIC_SELLERS */}
            {formScope === "SPECIFIC_SELLERS" && (
              <div className="space-y-2">
                <Label>Vendedores *</Label>
                <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                  {sellers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum vendedor cadastrado</p>
                  ) : (
                    sellers.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={formSellerIds.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormSellerIds((prev) => [...prev, s.id]);
                            } else {
                              setFormSellerIds((prev) => prev.filter((id) => id !== s.id));
                            }
                          }}
                          className="rounded border-input"
                        />
                        {s.name}
                      </label>
                    ))
                  )}
                </div>
                {formSellerIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formSellerIds.length} vendedor(es) selecionado(s)
                  </p>
                )}
              </div>
            )}

            {/* Unidade (opcional) */}
            <div className="space-y-2">
              <Label>Unidade (opcional)</Label>
              <Select
                value={formUnitId || "__none__"}
                onValueChange={(v) => v && setFormUnitId(v === "__none__" ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {formUnitId
                      ? units.find((u) => u.id === formUnitId)?.name ?? "Todas as unidades"
                      : "Todas as unidades (global)"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todas as unidades (global)</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="space-y-3 rounded-lg border p-3">
              <ToggleOption
                label="KPI Individual"
                description="Este KPI e acompanhado individualmente por vendedor"
                checked={formIndividual}
                onChange={setFormIndividual}
              />
              <ToggleOption
                label="Obrigatório"
                description="Preenchimento obrigatório nos lançamentos"
                checked={formRequired}
                onChange={setFormRequired}
              />
              <ToggleOption
                label="Primario"
                description="Exibido com destaque no dashboard"
                checked={formPrimary}
                onChange={setFormPrimary}
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

      {/* ──────── Delete Confirmation ──────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir KPI</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o KPI{" "}
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

      {/* ──────── Monthly Targets Modal ──────── */}
      <Dialog open={mtOpen} onOpenChange={setMtOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Metas Mensais - {mtYear}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMtYear((y) => y - 1);
                // re-fetch will happen via effect below
              }}
            >
              Ano anterior
            </Button>
            <span className="font-medium text-sm">{mtYear}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMtYear((y) => y + 1);
              }}
            >
              Proximo ano
            </Button>
          </div>

          {mtLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : kpis.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum KPI cadastrado. Crie KPIs primeiro.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium min-w-[140px]">
                      KPI
                    </th>
                    {MONTH_LABELS.map((m) => (
                      <th key={m} className="text-center py-2 px-1 font-medium min-w-[60px]">
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((kpi) => (
                    <tr key={kpi.id} className="border-b">
                      <td className="py-2 pr-4 font-medium">{kpi.name}</td>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <td key={i} className="py-1 px-0.5">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            className="h-7 w-[60px] text-center text-xs px-1"
                            value={getMtValue(kpi.id, i + 1)}
                            onChange={(e) =>
                              setMtValue(kpi.id, i + 1, e.target.value)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={saveMonthlyTargets} disabled={mtSaving}>
              {mtSaving ? "Salvando..." : "Salvar Metas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Toggle option sub-component
// ────────────────────────────────────────────────────────────

function ToggleOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          checked ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
