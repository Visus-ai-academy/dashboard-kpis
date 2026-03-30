"use client";

import { useState, useEffect, useCallback, use } from "react";
import { CheckCircle2, Loader2, AlertCircle, Send } from "lucide-react";
import { formatCurrency, formatPercentage, formatNumber } from "@/lib/utils/formatting";

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

interface LaunchData {
  seller: { id: string; name: string; teamName: string | null };
  kpis: KpiItem[];
  currentDate: string;
}

const PERIODICITY_LABELS: Record<string, string> = {
  DAILY: "Diário",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
};

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export default function LaunchPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LaunchData | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/launch/${token}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error?.message ?? "Link inválido");
      }
    } catch {
      setError("Erro ao carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function formatDisplayValue(type: string, value: number): string {
    switch (type) {
      case "MONETARY":
        return formatCurrency(value);
      case "PERCENTAGE":
        return formatPercentage(value);
      default:
        return formatNumber(value);
    }
  }

  function getInputPrefix(type: string): string {
    switch (type) {
      case "MONETARY":
        return "R$";
      case "PERCENTAGE":
        return "%";
      default:
        return "";
    }
  }

  async function handleSubmit() {
    if (!data) return;

    const unfilled = data.kpis.filter((k) => !k.filled);
    const entries = unfilled
      .filter((kpi) => {
        const val = values[kpi.id];
        return val !== undefined && val !== "" && !isNaN(parseFloat(val));
      })
      .map((kpi) => ({
        kpiId: kpi.id,
        value: parseFloat(values[kpi.id]),
        notes: notes[kpi.id] || undefined,
      }));

    // Validate required KPIs
    const requiredUnfilled = unfilled.filter((k) => k.isRequired);
    const missingRequired = requiredUnfilled.filter(
      (k) => !entries.find((e) => e.kpiId === k.id)
    );

    if (missingRequired.length > 0) {
      setError(
        `Preencha os KPIs obrigatórios: ${missingRequired.map((k) => k.name).join(", ")}`
      );
      return;
    }

    if (entries.length === 0) {
      setError("Preencha pelo menos um KPI para lançar.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/launch/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries),
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

  // ──────────── Loading state ────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f6f4] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-8 text-[#34594F] animate-spin mx-auto mb-3" />
          <p className="text-[#6D8C84] text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // ──────────── Error state (invalid token) ────────────
  if (!data) {
    return (
      <div className="min-h-screen bg-[#f0f6f4] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm ring-1 ring-[#C1D9D4] p-8 text-center">
          <AlertCircle className="size-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#112622] mb-2">
            Link Inválido
          </h1>
          <p className="text-[#6D8C84] text-sm">
            {error ?? "Este link de lançamento não é válido ou o vendedor está inativo."}
          </p>
        </div>
      </div>
    );
  }

  // ──────────── Success state ────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f0f6f4] flex items-center justify-center p-4">
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
              setValues({});
              setNotes({});
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

  // ──────────── Main form ────────────
  const unfilled = data.kpis.filter((k) => !k.filled);
  const filled = data.kpis.filter((k) => k.filled);
  const formattedDate = new Date(data.currentDate + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#f0f6f4]">
      {/* Header */}
      <header className="bg-[#112622] text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white">
              <span className="text-sm font-bold text-[#112622]">V</span>
            </div>
            <span className="text-lg font-bold tracking-tight">Visus</span>
          </div>
          <p className="text-[#C1D9D4] text-sm mt-3">Lançamento de Dados</p>
          <h1 className="text-xl font-bold mt-1">{data.seller.name}</h1>
          {data.seller.teamName && (
            <p className="text-[#6D8C84] text-sm mt-0.5">{data.seller.teamName}</p>
          )}
          <p className="text-[#C1D9D4] text-xs mt-2 capitalize">{formattedDate}</p>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
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
                    <p className="text-sm font-medium text-[#112622]">{kpi.name}</p>
                    <p className="text-xs text-[#6D8C84]">
                      {PERIODICITY_LABELS[kpi.periodicity] ?? kpi.periodicity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#34594F]">
                      {kpi.existingValue !== null
                        ? formatDisplayValue(kpi.type, kpi.existingValue)
                        : "—"}
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
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#112622]">
              KPIs para preencher
            </h2>
            {unfilled.map((kpi) => {
              const prefix = getInputPrefix(kpi.type);
              return (
                <div
                  key={kpi.id}
                  className="rounded-xl bg-white ring-1 ring-[#C1D9D4] p-4 space-y-3"
                >
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
                          <> — Meta: {formatDisplayValue(kpi.type, kpi.targetValue)}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {prefix && (
                      <span className="text-sm font-medium text-[#6D8C84]">
                        {prefix}
                      </span>
                    )}
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={values[kpi.id] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [kpi.id]: e.target.value }))
                      }
                      className="flex-1 rounded-lg border border-[#C1D9D4] bg-white px-3 py-2 text-sm text-[#112622] placeholder:text-[#6D8C84]/50 outline-none focus:border-[#34594F] focus:ring-2 focus:ring-[#34594F]/20 transition-colors"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Observações (opcional)"
                    maxLength={500}
                    value={notes[kpi.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [kpi.id]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[#C1D9D4] bg-white px-3 py-2 text-xs text-[#112622] placeholder:text-[#6D8C84]/50 outline-none focus:border-[#34594F] focus:ring-2 focus:ring-[#34594F]/20 transition-colors"
                  />
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
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-lg px-4 pb-8 text-center">
        <p className="text-xs text-[#6D8C84]">
          Visus Dashboard — Lançamento de Dados
        </p>
      </footer>
    </div>
  );
}
