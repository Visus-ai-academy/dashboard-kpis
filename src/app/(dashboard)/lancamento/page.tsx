"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Send,
  CalendarDays,
  Plus,
  Trash2,
  Users,
  Hash,
} from "lucide-react";
import {
  formatCurrency,
  formatNumber,
} from "@/lib/utils/formatting";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface KpiItem {
  id: string;
  name: string;
  type: string;
  periodicity: string;
  targetValue: number;
  isRequired: boolean;
  filled: boolean;
  existingValue: number | null;
}

interface ClientItem {
  id: string;
  name: string;
  status: string;
}

interface LaunchData {
  seller: { id: string; name: string; teamName: string | null };
  kpis: KpiItem[];
  currentDate: string;
}

interface KpiEntryRow {
  clientId: string;
  value: number | string;
  notes: string;
}

interface KpiEntry {
  rows: KpiEntryRow[];
}

const PERIODICITY_LABELS: Record<string, string> = {
  DAILY: "Diário",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
};

function isMonetaryKpi(type: string): boolean {
  return type === "MONETARY";
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export default function LancamentoPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LaunchData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clients, setClients] = useState<ClientItem[]>([]);

  // Per-KPI entries: Record<kpiId, { rows: [...] }>
  const [kpiEntries, setKpiEntries] = useState<Record<string, KpiEntry>>({});
  // Per-KPI mode: "quick" (single number) or "detailed" (per client)
  const [kpiMode, setKpiMode] = useState<Record<string, "quick" | "detailed">>({});
  // Quick mode values
  const [quickValues, setQuickValues] = useState<Record<string, { value: string; notes: string; clientId: string }>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [launchRes, clientsRes] = await Promise.all([
        fetch("/api/entries/launch"),
        fetch("/api/clients"),
      ]);
      const [launchJson, clientsJson] = await Promise.all([
        launchRes.json(),
        clientsRes.json(),
      ]);
      if (launchJson.success) {
        setData(launchJson.data);
        setError(null);
      } else {
        setError(launchJson.error?.message ?? "Erro ao carregar dados");
      }
      if (clientsJson.success) {
        setClients(clientsJson.data.filter((c: ClientItem) => c.status !== "INACTIVE"));
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getRows(kpiId: string): KpiEntryRow[] {
    return kpiEntries[kpiId]?.rows ?? [];
  }

  function addRow(kpiId: string) {
    setKpiEntries((prev) => ({
      ...prev,
      [kpiId]: {
        rows: [...(prev[kpiId]?.rows ?? []), { clientId: "", value: "", notes: "" }],
      },
    }));
  }

  function removeRow(kpiId: string, index: number) {
    setKpiEntries((prev) => ({
      ...prev,
      [kpiId]: {
        rows: (prev[kpiId]?.rows ?? []).filter((_, i) => i !== index),
      },
    }));
  }

  function updateRow(kpiId: string, index: number, field: keyof KpiEntryRow, value: string | number) {
    setKpiEntries((prev) => {
      const rows = [...(prev[kpiId]?.rows ?? [])];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, [kpiId]: { rows } };
    });
  }

  async function handleSubmit() {
    if (!data?.kpis) return;

    const unfilled = data.kpis.filter((k) => !k.filled);

    // Build flat payload from quick mode or detailed rows
    const payload: Array<{ kpiId: string; value: number; notes?: string; clientId?: string }> = [];

    for (const kpi of unfilled) {
      const mode = kpiMode[kpi.id] ?? "quick";

      if (mode === "quick") {
        const quick = quickValues[kpi.id];
        if (!quick) continue;
        const numValue = parseFloat(quick.value);
        if (isNaN(numValue) || numValue <= 0) continue;
        payload.push({
          kpiId: kpi.id,
          value: numValue,
          notes: quick.notes?.trim() || undefined,
          clientId: quick.clientId?.trim() || undefined,
        });
      } else {
        const rows = getRows(kpi.id);
        for (const row of rows) {
          const numValue = typeof row.value === "string" ? parseFloat(row.value) : row.value;
          if (isNaN(numValue) || numValue <= 0) continue;
          payload.push({
            kpiId: kpi.id,
            value: numValue,
            notes: row.notes?.trim() || undefined,
            clientId: row.clientId?.trim() || undefined,
          });
        }
      }
    }

    if (payload.length === 0) {
      setError("Informe pelo menos um valor para lançar.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/entries/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
      } else {
        setError(json.error?.message ?? "Erro ao lançar dados");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  // ──────────── Loading ────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="size-8 text-[#34594F] animate-spin mx-auto mb-3" />
          <p className="text-[#6D8C84] text-sm">Carregando KPIs...</p>
        </div>
      </div>
    );
  }

  // ──────────── Error loading data ────────────
  if (!data && error) {
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm ring-1 ring-[#C1D9D4] p-8 text-center">
          <AlertCircle className="size-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#112622] mb-2">
            Erro ao Carregar
          </h1>
          <p className="text-[#6D8C84] text-sm mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-lg bg-[#112622] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#214037]"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // ──────────── Success state ────────────
  if (submitted) {
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm ring-1 ring-[#C1D9D4] p-8 text-center">
          <div className="size-16 rounded-full bg-[#C1D9D4] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="size-8 text-[#112622]" />
          </div>
          <h1 className="text-xl font-bold text-[#112622] mb-2">
            Lançamento Realizado!
          </h1>
          <p className="text-[#6D8C84] text-sm mb-6">
            Seus dados foram registrados com sucesso.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setKpiEntries({});
              fetchData();
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#112622] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#214037]"
          >
            Fazer Novo Lançamento
          </button>
        </div>
      </div>
    );
  }

  if (!data?.kpis) return null;

  // ──────────── Main form ────────────
  const unfilled = data.kpis.filter((k) => !k.filled);
  const filled = data.kpis.filter((k) => k.filled);
  const formattedDate = new Date(
    data.currentDate + "T12:00:00"
  ).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Date display */}
      <div className="flex items-center gap-2 text-[#6D8C84]">
        <CalendarDays className="size-4" />
        <span className="text-sm capitalize">{formattedDate}</span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Already filled KPIs */}
      {filled.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-[#112622]">
            Já preenchidos neste período
          </h2>
          {filled.map((kpi) => (
            <div
              key={kpi.id}
              className="rounded-xl bg-white ring-1 ring-[#C1D9D4] p-4 opacity-70"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#112622]">
                    {kpi.name}
                  </p>
                  <p className="text-xs text-[#6D8C84]">
                    {PERIODICITY_LABELS[kpi.periodicity] ?? kpi.periodicity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#34594F]">
                    {kpi.existingValue !== null
                      ? isMonetaryKpi(kpi.type)
                        ? formatCurrency(kpi.existingValue)
                        : formatNumber(kpi.existingValue)
                      : "\u2014"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#C1D9D4] px-2.5 py-0.5 text-xs font-medium text-[#112622]">
                    <CheckCircle2 className="size-3" />
                    Preenchido
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPIs to fill */}
      {unfilled.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#112622]">
            KPIs para preencher
          </h2>

          {unfilled.map((kpi) => {
            const mode = kpiMode[kpi.id] ?? "quick";
            const rows = getRows(kpi.id);
            const monetary = isMonetaryKpi(kpi.type);
            const quick = quickValues[kpi.id] ?? { value: "", notes: "", clientId: "" };

            const totalDetailed = rows.reduce((sum, r) => {
              const v = typeof r.value === "string" ? parseFloat(r.value) : r.value;
              return sum + (isNaN(v) ? 0 : v);
            }, 0);

            return (
              <div
                key={kpi.id}
                className="rounded-xl bg-white ring-1 ring-[#C1D9D4] overflow-hidden"
              >
                {/* KPI Header */}
                <div className="px-4 py-3 bg-[#f8fbfa] border-b border-[#C1D9D4]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#112622]">
                        {kpi.name}
                        {kpi.isRequired && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </p>
                      <p className="text-xs text-[#6D8C84]">
                        {PERIODICITY_LABELS[kpi.periodicity] ?? kpi.periodicity}
                        {kpi.targetValue > 0 && (
                          <>
                            {" \u2014 Meta: "}
                            {monetary
                              ? formatCurrency(kpi.targetValue)
                              : formatNumber(kpi.targetValue)}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {mode === "detailed" && rows.length > 0 && (
                        <div className="text-right mr-2">
                          <p className="text-[10px] text-[#6D8C84]">Total</p>
                          <p className="text-sm font-bold text-[#112622]">
                            {monetary ? formatCurrency(totalDetailed) : formatNumber(totalDetailed)}
                          </p>
                        </div>
                      )}
                      {/* Mode toggle */}
                      <div className="flex items-center rounded-md border border-[#C1D9D4] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setKpiMode((p) => ({ ...p, [kpi.id]: "quick" }))}
                          className={`px-2 py-1 text-[10px] flex items-center gap-1 transition-colors ${mode === "quick" ? "bg-[#112622] text-white" : "text-[#6D8C84] hover:bg-[#C1D9D4]/20"}`}
                          title="Lançamento rápido"
                        >
                          <Hash className="size-3" />
                          Rápido
                        </button>
                        <button
                          type="button"
                          onClick={() => setKpiMode((p) => ({ ...p, [kpi.id]: "detailed" }))}
                          className={`px-2 py-1 text-[10px] flex items-center gap-1 transition-colors ${mode === "detailed" ? "bg-[#112622] text-white" : "text-[#6D8C84] hover:bg-[#C1D9D4]/20"}`}
                          title="Por cliente"
                        >
                          <Users className="size-3" />
                          Por Cliente
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {mode === "quick" ? (
                    /* ── Quick mode: single value ── */
                    <>
                      <div className="flex items-center gap-2">
                        {monetary && (
                          <span className="text-sm font-medium text-[#6D8C84]">R$</span>
                        )}
                        <input
                          type="number"
                          min="0"
                          step={monetary ? "0.01" : "1"}
                          placeholder={monetary ? "0,00" : "0"}
                          value={quick.value}
                          onChange={(e) => setQuickValues((p) => ({ ...p, [kpi.id]: { ...quick, value: e.target.value } }))}
                          className="flex-1 rounded-lg border border-[#C1D9D4] bg-white px-3 py-2 text-sm text-[#112622] placeholder:text-[#6D8C84]/50 outline-none focus:border-[#34594F] focus:ring-2 focus:ring-[#34594F]/20 transition-colors"
                        />
                      </div>
                      <select
                        value={quick.clientId}
                        onChange={(e) => setQuickValues((p) => ({ ...p, [kpi.id]: { ...quick, clientId: e.target.value } }))}
                        className="w-full rounded-lg border border-[#C1D9D4] bg-white px-3 py-2 text-xs text-[#112622] outline-none focus:border-[#34594F] focus:ring-2 focus:ring-[#34594F]/20 transition-colors"
                      >
                        <option value="">Cliente (opcional)</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Observações"
                        maxLength={500}
                        value={quick.notes}
                        onChange={(e) => setQuickValues((p) => ({ ...p, [kpi.id]: { ...quick, notes: e.target.value } }))}
                        className="w-full rounded-lg border border-[#C1D9D4] bg-white px-3 py-1.5 text-xs text-[#112622] placeholder:text-[#6D8C84]/50 outline-none focus:border-[#34594F] focus:ring-2 focus:ring-[#34594F]/20 transition-colors"
                      />
                    </>
                  ) : (
                    /* ── Detailed mode: per client rows ── */
                    <>
                      {rows.map((row, index) => (
                        <div key={index} className="rounded-lg border border-[#C1D9D4]/60 p-3 space-y-2 bg-[#f8fbfa]">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-[#6D8C84]">
                              Entrada {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeRow(kpi.id, index)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            {monetary && (
                              <span className="text-sm font-medium text-[#6D8C84]">R$</span>
                            )}
                            <input
                              type="number"
                              min="0"
                              step={monetary ? "0.01" : "1"}
                              placeholder={monetary ? "0,00" : "0"}
                              value={row.value}
                              onChange={(e) => updateRow(kpi.id, index, "value", e.target.value)}
                              className="flex-1 rounded-lg border border-[#C1D9D4] bg-white px-3 py-1.5 text-sm text-[#112622] placeholder:text-[#6D8C84]/50 outline-none focus:border-[#34594F] focus:ring-2 focus:ring-[#34594F]/20 transition-colors"
                            />
                          </div>
                          <select
                            value={row.clientId}
                            onChange={(e) => updateRow(kpi.id, index, "clientId", e.target.value)}
                            className="w-full rounded-lg border border-[#C1D9D4] bg-white px-3 py-1.5 text-xs text-[#112622] outline-none focus:border-[#34594F] focus:ring-2 focus:ring-[#34594F]/20 transition-colors"
                          >
                            <option value="">Cliente (opcional)</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Observações"
                            maxLength={500}
                            value={row.notes}
                            onChange={(e) => updateRow(kpi.id, index, "notes", e.target.value)}
                            className="w-full rounded-lg border border-[#C1D9D4] bg-white px-3 py-1.5 text-xs text-[#112622] placeholder:text-[#6D8C84]/50 outline-none focus:border-[#34594F] focus:ring-2 focus:ring-[#34594F]/20 transition-colors"
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addRow(kpi.id)}
                        className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#C1D9D4] py-2.5 text-xs font-medium text-[#34594F] hover:bg-[#C1D9D4]/10 transition-colors"
                      >
                        <Plus className="size-3.5" />
                        Adicionar Entrada
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#112622] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#214037] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {submitting ? "Lançando..." : "Lançar"}
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-white ring-1 ring-[#C1D9D4] p-8 text-center">
          <CheckCircle2 className="size-10 text-[#34594F] mx-auto mb-3" />
          <p className="text-sm font-medium text-[#112622]">
            Todos os KPIs já foram preenchidos neste período!
          </p>
        </div>
      )}
    </div>
  );
}
