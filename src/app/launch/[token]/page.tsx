"use client";

import { useState, useEffect, useCallback, use } from "react";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Send,
  LogIn,
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
  requiresAuth?: boolean;
  seller: { id?: string; name: string; teamName: string | null };
  kpis?: KpiItem[];
  currentDate?: string;
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
// Component
// ────────────────────────────────────────────────────────────

export default function LaunchPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  // Auth state
  const [authEmail, setAuthEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sellerPreview, setSellerPreview] = useState<{
    name: string;
    teamName: string | null;
  } | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);

  // Form state
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LaunchData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clients, setClients] = useState<ClientItem[]>([]);

  // Per-KPI mode: "quick" (single number) or "detailed" (per client)
  const [kpiMode, setKpiMode] = useState<Record<string, "quick" | "detailed">>({});
  // Quick mode values
  const [quickValues, setQuickValues] = useState<Record<string, { value: string; notes: string; clientId: string }>>({});
  // Per-KPI entries for detailed mode
  const [kpiEntries, setKpiEntries] = useState<Record<string, KpiEntry>>({});

  // Store credentials for client fetching
  const [storedEmail, setStoredEmail] = useState("");
  const [storedCode, setStoredCode] = useState("");

  // Initial load: check if link is valid and get seller name
  const fetchPreview = useCallback(async () => {
    try {
      const res = await fetch(`/api/launch/${token}`);
      const json = await res.json();
      if (json.success && json.data.requiresAuth) {
        setSellerPreview(json.data.seller);
      } else if (json.success && !json.data.requiresAuth) {
        setData(json.data);
        setAuthenticated(true);
      } else if (!json.success) {
        setInvalidLink(true);
      }
    } catch {
      setInvalidLink(true);
    } finally {
      setAuthLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // Fetch clients after authentication
  const fetchClients = useCallback(async (email: string, code: string) => {
    try {
      const searchParams = new URLSearchParams({
        email: email.trim(),
        accessCode: code.trim(),
      });
      const res = await fetch(`/api/launch/${token}/clients?${searchParams}`);
      const json = await res.json();
      if (json.success) {
        setClients(json.data);
      }
    } catch {
      // Silently fail — clients are optional
    }
  }, [token]);

  // Authenticate with email + code
  async function handleAuth() {
    if (!authEmail.trim() || !authCode.trim()) {
      setAuthError("Preencha o e-mail e o código de acesso");
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    try {
      const searchParams = new URLSearchParams({
        email: authEmail.trim(),
        accessCode: authCode.trim(),
      });
      const res = await fetch(`/api/launch/${token}?${searchParams}`);
      const json = await res.json();

      if (json.success && !json.data.requiresAuth) {
        setData(json.data);
        setAuthenticated(true);
        setStoredEmail(authEmail.trim());
        setStoredCode(authCode.trim());
        // Fetch clients after successful auth
        fetchClients(authEmail.trim(), authCode.trim());
      } else {
        setAuthError(json.error?.message ?? "Credenciais inválidas");
      }
    } catch {
      setAuthError("Erro de conexão. Tente novamente.");
    } finally {
      setAuthLoading(false);
    }
  }

  // Also fetch clients when admin bypass authenticates (no email/code)
  useEffect(() => {
    if (authenticated && data && !storedEmail) {
      // Admin bypass — clients won't be fetched without credentials
      // This is expected; clients dropdown will be empty
    }
  }, [authenticated, data, storedEmail]);

  // Refetch data
  async function refetchData() {
    const searchParams = new URLSearchParams({
      email: storedEmail || authEmail.trim(),
      accessCode: storedCode || authCode.trim(),
    });
    const res = await fetch(`/api/launch/${token}?${searchParams}`);
    const json = await res.json();
    if (json.success && !json.data.requiresAuth) {
      setData(json.data);
    }
  }

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
        if (!quick) {
          if (kpi.isRequired) {
            setError(`Informe um valor para o KPI obrigatório "${kpi.name}"`);
            return;
          }
          continue;
        }

        const numValue = parseFloat(quick.value);

        if (isNaN(numValue) || numValue <= 0) {
          if (kpi.isRequired) {
            setError(`Informe um valor válido para "${kpi.name}"`);
            return;
          }
          continue;
        }

        payload.push({
          kpiId: kpi.id,
          value: numValue,
          notes: quick.notes?.trim() || undefined,
          clientId: quick.clientId?.trim() || undefined,
        });
      } else {
        const rows = getRows(kpi.id);
        let hasValidRow = false;

        for (const row of rows) {
          const numValue = typeof row.value === "string" ? parseFloat(row.value) : row.value;
          if (isNaN(numValue) || numValue <= 0) continue;
          hasValidRow = true;
          payload.push({
            kpiId: kpi.id,
            value: numValue,
            notes: row.notes?.trim() || undefined,
            clientId: row.clientId?.trim() || undefined,
          });
        }

        if (!hasValidRow && kpi.isRequired) {
          setError(`Informe pelo menos uma entrada válida para "${kpi.name}"`);
          return;
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
      const res = await fetch(`/api/launch/${token}`, {
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

  // ──────────── Initial loading ────────────
  if (authLoading && !authenticated) {
    return (
      <div className="min-h-screen bg-[#f0f6f4] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-8 text-[#34594F] animate-spin mx-auto mb-3" />
          <p className="text-[#6D8C84] text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // ──────────── Invalid link ────────────
  if (invalidLink) {
    return (
      <div className="min-h-screen bg-[#f0f6f4] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm ring-1 ring-[#C1D9D4] p-8 text-center">
          <AlertCircle className="size-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#112622] mb-2">
            Link Inválido
          </h1>
          <p className="text-[#6D8C84] text-sm">
            Este link de lançamento não é válido ou o vendedor está inativo.
          </p>
        </div>
      </div>
    );
  }

  // ──────────── Login screen ────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#f0f6f4]">
        <header className="bg-[#112622] text-white">
          <div className="mx-auto max-w-lg px-4 py-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white">
                <span className="text-sm font-bold text-[#112622]">V</span>
              </div>
              <span className="text-lg font-bold tracking-tight">Visus</span>
            </div>
            <p className="text-[#C1D9D4] text-sm mt-3">
              Lançamento de Dados
            </p>
            {sellerPreview && (
              <>
                <h1 className="text-xl font-bold mt-1">
                  {sellerPreview.name}
                </h1>
                {sellerPreview.teamName && (
                  <p className="text-[#6D8C84] text-sm mt-0.5">
                    {sellerPreview.teamName}
                  </p>
                )}
              </>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-lg px-4 py-8">
          <div className="rounded-2xl bg-white ring-1 ring-[#C1D9D4] p-6 space-y-5">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-[#112622]">
                Identificação
              </h2>
              <p className="text-sm text-[#6D8C84] mt-1">
                Informe seu e-mail e código de acesso para continuar
              </p>
            </div>

            {authError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#112622]">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                  className="w-full rounded-lg border border-[#C1D9D4] bg-white px-3 py-2.5 text-sm text-[#112622] placeholder:text-[#6D8C84]/50 outline-none focus:border-[#34594F] focus:ring-2 focus:ring-[#34594F]/20 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#112622]">
                  Código de Acesso
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1033BE7C"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                  className="w-full rounded-lg border border-[#C1D9D4] bg-white px-3 py-2.5 text-sm font-mono text-[#112622] placeholder:text-[#6D8C84]/50 outline-none focus:border-[#34594F] focus:ring-2 focus:ring-[#34594F]/20 transition-colors uppercase"
                />
              </div>
            </div>

            <button
              onClick={handleAuth}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#112622] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#214037] disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogIn className="size-4" />
              )}
              {authLoading ? "Verificando..." : "Entrar"}
            </button>
          </div>
        </main>

        <footer className="mx-auto max-w-lg px-4 pb-8 text-center">
          <p className="text-xs text-[#6D8C84]">
            Visus Dashboard -- Lançamento de Dados
          </p>
        </footer>
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
              setKpiEntries({});
              setQuickValues({});
              setKpiMode({});
              refetchData();
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#112622] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#214037]"
          >
            Fazer Novo Lançamento
          </button>
        </div>
      </div>
    );
  }

  // ──────────── No data ────────────
  if (!data?.kpis) {
    return (
      <div className="min-h-screen bg-[#f0f6f4] flex items-center justify-center">
        <Loader2 className="size-8 text-[#34594F] animate-spin" />
      </div>
    );
  }

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
    <div className="min-h-screen bg-[#f0f6f4]">
      {/* Header */}
      <header className="bg-[#112622] text-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white">
              <span className="text-sm font-bold text-[#112622]">V</span>
            </div>
            <span className="text-lg font-bold tracking-tight">Visus</span>
          </div>
          <p className="text-[#C1D9D4] text-sm mt-3">
            Lançamento de Dados
          </p>
          <h1 className="text-xl font-bold mt-1">{data.seller.name}</h1>
          {data.seller.teamName && (
            <p className="text-[#6D8C84] text-sm mt-0.5">
              {data.seller.teamName}
            </p>
          )}
          <p className="text-[#C1D9D4] text-xs mt-2 capitalize">
            {formattedDate}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
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
                      /* -- Quick mode: single value -- */
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
                          placeholder="Observações (opcional)"
                          maxLength={500}
                          value={quick.notes}
                          onChange={(e) => setQuickValues((p) => ({ ...p, [kpi.id]: { ...quick, notes: e.target.value } }))}
                          className="w-full rounded-lg border border-[#C1D9D4] bg-white px-3 py-1.5 text-xs text-[#112622] placeholder:text-[#6D8C84]/50 outline-none focus:border-[#34594F] focus:ring-2 focus:ring-[#34594F]/20 transition-colors"
                        />
                      </>
                    ) : (
                      /* -- Detailed mode: per client rows -- */
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

      <footer className="mx-auto max-w-2xl px-4 pb-8 text-center">
        <p className="text-xs text-[#6D8C84]">
          Visus Dashboard -- Lançamento de Dados
        </p>
      </footer>
    </div>
  );
}
