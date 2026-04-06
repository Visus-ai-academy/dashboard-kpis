"use client";

import { useState, useEffect, useCallback } from "react";
import { useUnitFilter } from "@/lib/hooks/use-unit-filter";
import { toast } from "sonner";
import { Plus, Trash2, CalendarOff } from "lucide-react";
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

interface NonWorkingDay {
  id: string;
  date: string;
  description: string | null;
  unitId: string | null;
  unitName: string | null;
  includeSaturday: boolean;
  includeSunday: boolean;
}

export default function NonWorkingDaysPage() {
  const unitId = useUnitFilter();

  const [days, setDays] = useState<NonWorkingDay[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formDate, setFormDate] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formUnitId, setFormUnitId] = useState<string | null>(null);
  const [formIncludeSaturday, setFormIncludeSaturday] = useState(false);
  const [formIncludeSunday, setFormIncludeSunday] = useState(false);

  const fetchDays = useCallback(async () => {
    setLoading(true);
    try {
      const unitParam = unitId ? `?unitId=${unitId}` : "";
      const [daysRes, unitsRes] = await Promise.all([
        fetch(`/api/non-working-days${unitParam}`),
        fetch("/api/units"),
      ]);
      const [daysJson, unitsJson] = await Promise.all([
        daysRes.json(),
        unitsRes.json(),
      ]);
      if (daysJson.success) setDays(daysJson.data);
      if (unitsJson.success) setUnits(unitsJson.data);
    } catch {
      toast.error("Erro ao carregar feriados");
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetchDays();
  }, [fetchDays]);

  async function handleCreate() {
    if (!formDate) {
      toast.error("Selecione uma data");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/non-working-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          description: formDescription || undefined,
          unitId: formUnitId || null,
          includeSaturday: formIncludeSaturday,
          includeSunday: formIncludeSunday,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Feriado cadastrado com sucesso");
        setDialogOpen(false);
        resetForm();
        fetchDays();
      } else {
        toast.error(json.error?.message ?? "Erro ao cadastrar feriado");
      }
    } catch {
      toast.error("Erro ao cadastrar feriado");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/non-working-days?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Feriado removido");
        fetchDays();
      } else {
        toast.error(json.error?.message ?? "Erro ao remover feriado");
      }
    } catch {
      toast.error("Erro ao remover feriado");
    }
  }

  function resetForm() {
    setFormDate("");
    setFormDescription("");
    setFormUnitId(null);
    setFormIncludeSaturday(false);
    setFormIncludeSunday(false);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      weekday: "long",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Feriados e Dias Não Úteis
          </h1>
          <p className="text-muted-foreground">
            Gerencie os feriados e dias sem expediente para cálculo de metas
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" data-icon="inline-start" />
          Novo Feriado
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-center">Sábado Útil</TableHead>
              <TableHead className="text-center">Domingo Útil</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : days.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  <div className="flex flex-col items-center gap-2">
                    <CalendarOff className="size-8 text-muted-foreground/50" />
                    <p>Nenhum feriado cadastrado</p>
                    <p className="text-xs">
                      Cadastre feriados para que o cálculo de metas diárias seja mais preciso
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              days.map((day) => (
                <TableRow key={day.id}>
                  <TableCell className="font-medium">
                    {formatDate(day.date)}
                  </TableCell>
                  <TableCell>{day.description ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {day.unitName ?? "Global"}
                  </TableCell>
                  <TableCell className="text-center">
                    {day.includeSaturday ? "Sim" : "Não"}
                  </TableCell>
                  <TableCell className="text-center">
                    {day.includeSunday ? "Sim" : "Não"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() => handleDelete(day.id)}
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

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Feriado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nwd-date" className="text-xs">
                Data
              </Label>
              <Input
                id="nwd-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nwd-desc" className="text-xs">
                Descrição (opcional)
              </Label>
              <Input
                id="nwd-desc"
                placeholder="Ex: Natal, Ano Novo..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unidade (opcional)</Label>
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
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-border accent-primary"
                  checked={formIncludeSaturday}
                  onChange={(e) => setFormIncludeSaturday(e.target.checked)}
                />
                <span className="text-sm">Sábado é dia útil</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-border accent-primary"
                  checked={formIncludeSunday}
                  onChange={(e) => setFormIncludeSunday(e.target.checked)}
                />
                <span className="text-sm">Domingo é dia útil</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
