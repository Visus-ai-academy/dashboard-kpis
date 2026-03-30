"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

interface Kpi {
  id: string;
  name: string;
  type: string;
  periodicity: string;
}

interface EntrySchedule {
  id: string;
  kpiId: string;
  frequency: string;
  deadlineTime: string | null;
  reminderEnabled: boolean;
  kpi: Kpi;
}

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Diário",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
};

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export default function EntrySchedulesPage() {
  const [schedules, setSchedules] = useState<EntrySchedule[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Form for new schedule
  const [formKpiId, setFormKpiId] = useState("");
  const [formFrequency, setFormFrequency] = useState("DAILY");
  const [formDeadline, setFormDeadline] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [schedulesRes, kpisRes] = await Promise.all([
        fetch("/api/entry-schedules"),
        fetch("/api/kpis"),
      ]);
      const [schedulesJson, kpisJson] = await Promise.all([
        schedulesRes.json(),
        kpisRes.json(),
      ]);
      if (schedulesJson.success) setSchedules(schedulesJson.data);
      if (kpisJson.success) setKpis(kpisJson.data);
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // KPIs that don't have a schedule yet
  const scheduledKpiIds = new Set(schedules.map((s) => s.kpiId));
  const unscheduledKpis = kpis.filter((k) => !scheduledKpiIds.has(k.id));

  async function handleAddSchedule() {
    if (!formKpiId) {
      toast.error("Selecione um KPI");
      return;
    }
    setAddingSaving(true);
    try {
      const res = await fetch("/api/entry-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kpiId: formKpiId,
          frequency: formFrequency,
          deadlineTime: formDeadline || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Configuração salva");
        setFormKpiId("");
        setFormFrequency("DAILY");
        setFormDeadline("");
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar configuração");
    } finally {
      setAddingSaving(false);
    }
  }

  async function handleUpdateSchedule(
    schedule: EntrySchedule,
    field: string,
    value: string
  ) {
    setSaving(schedule.id);
    try {
      const res = await fetch(`/api/entry-schedules/${schedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value || null }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Atualizado");
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao atualizar");
      }
    } catch {
      toast.error("Erro ao atualizar");
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id: string) {
    setSaving(id);
    try {
      const res = await fetch(`/api/entry-schedules/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Configuração removida");
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao remover");
      }
    } catch {
      toast.error("Erro ao remover");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Frequência de Lançamentos
        </h1>
        <p className="text-muted-foreground">
          Configure a frequência e horário limite de preenchimento por KPI
        </p>
      </div>

      {/* Add new schedule */}
      <div className="rounded-lg border p-4 space-y-4">
        <h2 className="text-sm font-semibold">Adicionar Configuração</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">KPI</Label>
            <Select value={formKpiId} onValueChange={(v) => v && setFormKpiId(v)}>
              <SelectTrigger className="w-full">
                <span className="flex flex-1 text-left truncate">
                  {formKpiId
                    ? unscheduledKpis.find((k) => k.id === formKpiId)?.name ??
                      "Selecione"
                    : "Selecione um KPI"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {unscheduledKpis.length === 0 ? (
                  <SelectItem value="" disabled>
                    Todos os KPIs já estão configurados
                  </SelectItem>
                ) : (
                  unscheduledKpis.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Frequência</Label>
            <Select
              value={formFrequency}
              onValueChange={(v) => v && setFormFrequency(v)}
            >
              <SelectTrigger className="w-full">
                <span className="flex flex-1 text-left truncate">
                  {FREQUENCY_LABELS[formFrequency] ?? "Selecione"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Diário</SelectItem>
                <SelectItem value="WEEKLY">Semanal</SelectItem>
                <SelectItem value="MONTHLY">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deadline" className="text-xs">
              Horário Limite
            </Label>
            <Input
              id="deadline"
              type="time"
              value={formDeadline}
              onChange={(e) => setFormDeadline(e.target.value)}
              placeholder="18:00"
            />
          </div>
          <Button onClick={handleAddSchedule} disabled={addingSaving || !formKpiId}>
            <Save className="size-3.5" data-icon="inline-start" />
            {addingSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Existing schedules */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>KPI</TableHead>
              <TableHead>Periodicidade do KPI</TableHead>
              <TableHead>Frequência de Lançamento</TableHead>
              <TableHead>Horário Limite</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : schedules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  Nenhuma configuração cadastrada
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">
                    {schedule.kpi.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {FREQUENCY_LABELS[schedule.kpi.periodicity] ??
                        schedule.kpi.periodicity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={schedule.frequency}
                      onValueChange={(v) =>
                        v && handleUpdateSchedule(schedule, "frequency", v)
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <span className="flex flex-1 text-left truncate">
                          {FREQUENCY_LABELS[schedule.frequency] ?? schedule.frequency}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Diário</SelectItem>
                        <SelectItem value="WEEKLY">Semanal</SelectItem>
                        <SelectItem value="MONTHLY">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      className="w-[120px]"
                      defaultValue={schedule.deadlineTime ?? ""}
                      onBlur={(e) =>
                        handleUpdateSchedule(
                          schedule,
                          "deadlineTime",
                          e.target.value
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDelete(schedule.id)}
                      disabled={saving === schedule.id}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
